// The letter bag and the per-turn deal.
//
// Rulebook §4 step 1: every turn all 100 tiles return to the bag and remix.
// Dice have no memory and neither does the bag.

import { turnRandom, shuffle } from './rng.js';

/** Expand the ruleset's distribution into a 100-entry array of letters ('_' = blank). */
export function buildBag(ruleset) {
  const counts = ruleset.tileDistribution.counts;
  const out = [];
  for (const letter of Object.keys(counts)) {
    const symbol = letter === 'BLANK' ? '_' : letter;
    for (let i = 0; i < counts[letter]; i++) out.push(symbol);
  }
  return out;
}

export function tileValue(ruleset, letter) {
  if (letter === '_') return ruleset.tileDistribution.values.BLANK;
  return ruleset.tileDistribution.values[letter] ?? 0;
}

function makeTile(ruleset, symbol, id) {
  const blank = symbol === '_';
  return {
    id,
    blank,
    letter: blank ? '' : symbol, // a blank carries no letter until assigned
    value: blank ? ruleset.tileDistribution.values.BLANK : tileValue(ruleset, symbol)
  };
}

/**
 * Weighted pick of the tile that would come up red, by value raised to
 * `exponent` — the harder the letter, the likelier it is. Blanks are worth 0 and
 * so are never eligible. Returns -1 when nothing in the rack can be red.
 */
function pickRedIndex(rack, rnd, exponent) {
  const weights = rack.map((t) => (t.blank ? 0 : Math.pow(t.value, exponent)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (!total) return -1;
  let point = rnd() * total;
  for (let i = 0; i < weights.length; i++) {
    point -= weights[i];
    if (point < 0) return i;
  }
  return weights.length - 1;
}

/**
 * Deal one turn.
 *
 * Same (seed, turnNo, budget) always yields the same opening rack AND the same
 * ordered replacement queue — players who discard different tiles, or different
 * quantities, still receive the same first replacement, second replacement and
 * so on. Choice is preserved; luck is reproducible.
 *
 * @param options  { redTilesLeft } — how many red tiles the game will still
 *                 allow. Omitted means no cap.
 */
export function drawTurn(ruleset, seed, turnNo, budget, options = {}) {
  const rnd = turnRandom(seed, turnNo);
  const bag = shuffle(buildBag(ruleset), rnd);
  const queueLength = Math.min(
    Math.max(
      ruleset.refresh.replacementQueueLength,
      ruleset.refresh.count * ruleset.refresh.maximumTiles
    ),
    bag.length - budget
  );
  const rack = bag.slice(0, budget).map((s, i) => makeTile(ruleset, s, turnNo + '-r' + i));
  const queue = bag
    .slice(budget, budget + queueLength)
    .map((s, i) => makeTile(ruleset, s, turnNo + '-q' + i));

  // Red Tile. The `&& ruleset.redTile` half of the guard is load-bearing the
  // same way the evaluator's is: run.ruleset is a snapshot persisted into
  // localStorage, so a game started before this variant existed resumes with no
  // such block. Both draws off the stream happen whether or not the per-game cap
  // allows one, so (seed, turnNo) alone decides which tile *would* be red and
  // the cap only suppresses it.
  if (ruleset.experimentalVariants.redTile && ruleset.redTile) {
    const hit = rnd() < ruleset.redTile.rarity;
    const index = pickRedIndex(rack, rnd, ruleset.redTile.weightExponent);
    const left = options.redTilesLeft === undefined ? Infinity : options.redTilesLeft;
    if (hit && index >= 0 && left > 0) rack[index].red = true;
  }

  return { rack, queue };
}

/** Sum of tile values. Blanks are 0 — rulebook §10. */
export function sumTileValue(tiles) {
  return tiles.reduce((a, t) => a + (t.blank ? 0 : t.value), 0);
}
