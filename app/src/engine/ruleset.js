// The single authoritative gameplay configuration.
//
// PRD §11.4: "Gameplay numbers must come from a versioned configuration object,
// not scattered constants." Nothing in this codebase is allowed to hardcode 40,
// 63, 35, 3, 9 or any other tunable. Read them from here.

/** Loaded once at boot from data/ruleset.json and then frozen. */
let STANDARD = null;

export async function loadStandardRuleset(url = './data/ruleset.json') {
  if (STANDARD) return STANDARD;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load ruleset.json (' + res.status + ')');
  STANDARD = deepFreeze(await res.json());
  return STANDARD;
}

export function standardRuleset() {
  if (!STANDARD) throw new Error('Ruleset not loaded yet');
  return STANDARD;
}

/**
 * The Gameplay Lab produces a sparse patch. Merge it over the standard ruleset
 * to get the effective config for a run. Structural safeguards (slot count, rank
 * bands, category definitions) are stripped: PRD §11.5 says they change what the
 * scorecard *means* and must never be reachable from the Lab.
 */
export function effectiveRuleset(lab) {
  const base = standardRuleset();
  if (!lab || !lab.enabled) return base;
  const r = structuredCloneish(base);
  const L = lab.values;

  for (const key of Object.keys(r.difficulty)) {
    if (L.budgetOverride) r.difficulty[key].budget = L.budget;
    r.difficulty[key].upperBonusThreshold = L.upperBonusThreshold;
  }
  r.refresh.count = L.refreshCount;
  r.refresh.maximumTiles = L.refreshMaximumTiles;
  r.refresh.replacementQueueLength = Math.max(
    r.refresh.replacementQueueLength,
    L.refreshCount * L.refreshMaximumTiles
  );
  r.upperBonusPoints = L.upperBonusPoints;
  r.tileValueScoring.multipliers = {
    threeKind: L.tvThreeKind,
    fourKind: L.tvFourKind,
    fullHouse: L.tvFullHouse,
    smallStraight: L.tvSmallStraight,
    largeStraight: L.tvLargeStraight,
    chance: L.tvChance,
    rackFive: L.tvRackFive
  };
  r.redTile.rarity = L.redTileRarity;
  r.redTile.multiplier = L.redTileMultiplier;
  r.dictionaryMissPenalty.maximumFreeMisses = L.missPenaltyFreeMisses;
  r.dictionaryMissPenalty.pointsPerExtraMiss = L.missPenaltyPoints;
  r.jumbo.minimumLength = L.jumboMinimumLength;
  r.jumbo.pointsPerLetter = L.jumboPointsPerLetter;
  r.wordBank.hintCost = L.hintCost;
  r.wordBank.maximumHints = L.maximumHints;
  r.wordBank.method = L.wordBankMethod;
  r.timingSeconds.standard = L.standardSeconds;
  r.timingSeconds.blitz = L.blitzSeconds;
  r.experimentalVariants = { ...r.experimentalVariants, ...L.variants };
  r.rulesetVersion = base.rulesetVersion + '-custom';

  // Locked by ruleset.json → structuralSafeguards. Restore them unconditionally
  // so no Lab state can ever leak into them.
  for (const key of base.structuralSafeguards.locked) {
    if (key in base) r[key] = structuredCloneish(base[key]);
  }
  return deepFreeze(r);
}

/** The Lab's default values, derived from the standard ruleset so they never drift. */
export function labDefaults() {
  const r = standardRuleset();
  return {
    budgetOverride: false,
    budget: r.difficulty.medium.budget,
    refreshCount: r.refresh.count,
    refreshMaximumTiles: r.refresh.maximumTiles,
    upperBonusThreshold: r.difficulty.medium.upperBonusThreshold,
    upperBonusPoints: r.upperBonusPoints,
    // These sit at their intended variant values and are inert while the
    // variant is off, so no multiplier on its own makes a run Custom.
    tvThreeKind: r.tileValueScoring.multipliers.threeKind,
    tvFourKind: r.tileValueScoring.multipliers.fourKind,
    tvFullHouse: r.tileValueScoring.multipliers.fullHouse,
    tvSmallStraight: r.tileValueScoring.multipliers.smallStraight,
    tvLargeStraight: r.tileValueScoring.multipliers.largeStraight,
    tvChance: r.tileValueScoring.multipliers.chance,
    tvRackFive: r.tileValueScoring.multipliers.rackFive,
    redTileRarity: r.redTile.rarity,
    redTileMultiplier: r.redTile.multiplier,
    missPenaltyFreeMisses: r.dictionaryMissPenalty.maximumFreeMisses,
    missPenaltyPoints: r.dictionaryMissPenalty.pointsPerExtraMiss,
    jumboMinimumLength: r.jumbo.minimumLength,
    jumboPointsPerLetter: r.jumbo.pointsPerLetter,
    hintCost: r.wordBank.hintCost,
    maximumHints: r.wordBank.maximumHints,
    wordBankMethod: r.wordBank.method,
    standardSeconds: r.timingSeconds.standard,
    blitzSeconds: r.timingSeconds.blitz,
    variants: { ...r.experimentalVariants }
  };
}

/** Short names for the experimental variants, for badges and leaderboard rows. */
export const VARIANT_LABELS = {
  tileValueScoring: 'Tile Value',
  redTile: 'Red Tile',
  dictionaryMissPenalty: 'Miss Penalty',
  blindDeclaration: 'Blind',
  carryOver: 'Carry-Over',
  powerLetters: 'Power Letters'
};

/**
 * A one-line summary of how a run's variants departed from standard, or null
 * when they did not. Tile Value Scoring and Red Tile are on by default, so a tag
 * lists deviations rather than everything switched on — otherwise every
 * ordinary run would carry a badge and the badge would mean nothing.
 */
export function variantTag(variants) {
  if (!variants) return null;
  const base = standardRuleset().experimentalVariants;
  const parts = Object.keys(VARIANT_LABELS)
    .filter((k) => !!variants[k] !== !!base[k])
    .map((k) => (variants[k] ? VARIANT_LABELS[k] : `No ${VARIANT_LABELS[k]}`));
  return parts.length ? parts.join(' · ') : null;
}

/**
 * Some variants only make sense at a different balance point, and some depend on
 * another variant entirely. Toggling one carries those numbers and flags in, and
 * puts them back on the way out. Each entry maps a variant key to the Lab values
 * it drags along; a `variants` key inside the returned object sets other switches.
 *
 * Tile Value Scoring is the default scoring mode and its lower section pays
 * roughly double, which is why the standard upper bonus is 100. Turning it off
 * has to drop the bonus back to the rank-scoring figure or the upper half
 * becomes the only thing worth chasing.
 *
 * Red Tile multiplies a lower-section payout that is computed from tile values,
 * so it is inert without Tile Value Scoring and seeds it on.
 */
export const VARIANT_PRESETS = {
  tileValueScoring: (r, on) => ({
    upperBonusPoints: on ? r.tileValueScoring.upperBonusPoints : r.rankScoring.upperBonusPoints
  }),
  redTile: (r, on) => (on ? { variants: { tileValueScoring: true } } : {})
};

/** Variants that cannot be switched off while the variant keying this map is on. */
export const VARIANT_REQUIRES = {
  redTile: ['tileValueScoring']
};

/**
 * The variants currently held on by something else, mapped to the variant
 * holding them. The Lab reads this to disable a switch and say why.
 */
export function lockedVariants(variants) {
  const locked = {};
  if (!variants) return locked;
  for (const owner of Object.keys(VARIANT_REQUIRES)) {
    if (!variants[owner]) continue;
    for (const needed of VARIANT_REQUIRES[owner]) locked[needed] = owner;
  }
  return locked;
}

/**
 * Reconcile a persisted Lab blob with the current shape.
 *
 * Two hazards this exists to close. Unknown keys left over from a removed
 * setting would never match labDefaults(), and `variants` is a nested object —
 * a plain spread would replace it wholesale, so a blob saved before a variant
 * was added or removed permanently fails the labIsModified() comparison and
 * silently locks the player out of standard leaderboards.
 */
export function sanitizeLabValues(saved) {
  const defaults = labDefaults();
  if (!saved || typeof saved !== 'object') return defaults;
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key === 'variants') continue;
    if (key in saved && typeof saved[key] === typeof defaults[key]) out[key] = saved[key];
  }
  out.variants = { ...defaults.variants };
  for (const key of Object.keys(defaults.variants)) {
    if (saved.variants && typeof saved.variants[key] === 'boolean') {
      out.variants[key] = saved.variants[key];
    }
  }
  return out;
}

/**
 * True when any Lab value differs from standard — this is what makes a run
 * Custom. A budget slider that is not switched on does not count, because it
 * changes nothing about the run.
 */
export function labIsModified(values) {
  const strip = (v) => {
    const copy = { ...v };
    if (!copy.budgetOverride) delete copy.budget;
    return copy;
  };
  return JSON.stringify(strip(values)) !== JSON.stringify(strip(labDefaults()));
}

export function budgetFor(ruleset, difficulty) {
  return ruleset.difficulty[difficulty].budget;
}

export function turnSecondsFor(ruleset, timing) {
  return ruleset.timingSeconds[timing];
}

function structuredCloneish(v) {
  return JSON.parse(JSON.stringify(v));
}

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}
