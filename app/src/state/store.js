// Application state, the run/turn model, and every gameplay action.
//
// The data model deliberately has room for other players from day one
// (rulebook §9): `players` is an array of length one and `matchId` is null.
// Nothing here may assume there is exactly one player.

import {
  standardRuleset,
  effectiveRuleset,
  labDefaults,
  labIsModified,
  sanitizeLabValues,
  variantTag,
  lockedVariants,
  VARIANT_PRESETS
} from '../engine/ruleset.js';
import { drawTurn } from '../engine/bag.js';
import { lengthToRank } from '../engine/rank.js';
import { evaluate, cardTotals, describeScore, redTileApplies } from '../engine/evaluator.js';
import { CATEGORIES, emptyCard, cardComplete, categoryName } from '../engine/categories.js';
import { validatePlacement } from '../engine/validation.js';
import { findHint } from '../engine/hints.js';
import { assertBudget } from '../engine/invariant.js';
import { newSeed, normaliseSeed } from '../engine/rng.js';
import {
  DICTIONARIES,
  DEFAULT_DICTIONARY_ID,
  loadDictionary,
  dictionaryMeta
} from '../engine/dictionary.js';
import { KEYS, read, write, remove, download } from './storage.js';
import { fetchRemote, pushRemote, mergeBoards } from './leaderboardSync.js';
import { play, configureAudio, unlockAudio } from '../audio/sfx.js';

/* ── Store primitive ─────────────────────────────────────────────────────── */

const listeners = new Set();
let state = null;

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function set(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  if (!next) return;
  state = { ...state, ...next };
  for (const fn of listeners) fn(state);
}

/* ── Defaults ────────────────────────────────────────────────────────────── */

export const DEFAULT_SETTINGS = {
  theme: 'feltwork',
  sort: 'draw',
  strictDictionary: true,
  dictionaryId: DEFAULT_DICTIONARY_ID,
  sound: true,
  haptics: true,
  reduceMotion: false,
  highContrast: false,
  largeLabels: false,
  instrumentation: false,
  tutorialSeen: false
};

function freshSetup() {
  return {
    difficulty: 'medium',
    timing: 'relaxed',
    gameLength: 'full',
    seed: newSeed(),
    seedInput: '',
    seedError: null
  };
}

/* ── Boot ────────────────────────────────────────────────────────────────── */

export function initStore() {
  const settings = { ...DEFAULT_SETTINGS, ...(read(KEYS.settings) || {}) };
  // Reconciled, not spread: `variants` is nested, so a plain spread would let a
  // blob saved under an older variant list strand the player on a Custom run.
  const labValues = sanitizeLabValues(read(KEYS.lab));
  const saved = read(KEYS.save);
  const leaderboard = mergeBoards(read(KEYS.leaderboard) || [], []);

  state = {
    ready: true,
    screen: 'home',
    settings,
    lab: { enabled: labIsModified(labValues), values: labValues },
    setup: freshSetup(),
    run: saved && saved.run ? saved.run : null,
    turn: saved && saved.turn ? saved.turn : null,
    modal: null,
    toast: null,
    helpCat: null,
    helpTip: null,
    hoverTip: null,
    lbView: { difficulty: 'easy', timing: 'all' },
    leaderboard,
    lastEntryId: null,
    pendingEntry: null,
    nameDraft: '',
    dict: { id: settings.dictionaryId, status: 'loading', count: 0 },
    lastResult: null
  };

  applyChrome(settings);
  configureAudio(settings);
  ensureDictionary(settings.dictionaryId);
  syncLeaderboard();

  // A run interrupted by a reload is recorded — PRD §12.8 wants the action log
  // to know, so future competitive modes can apply a stricter policy.
  if (state.run && state.turn) {
    logAction('run_resumed_from_storage', {});
    if (state.run.timing !== 'relaxed') markInterrupted();
  }
  return state;
}

function applyChrome(settings) {
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.theme);
  root.classList.toggle('reduce-motion', !!settings.reduceMotion);
  root.classList.toggle('high-contrast', !!settings.highContrast);
  root.classList.toggle('large-labels', !!settings.largeLabels);
}

async function ensureDictionary(id) {
  set({ dict: { id, status: 'loading', count: 0 } });
  const loaded = await loadDictionary(id);
  set({ dict: { id, status: loaded.status, count: loaded.count, reason: loaded.reason } });
  dictCache = loaded;
  return loaded;
}

let dictCache = null;

/* ── Selectors ───────────────────────────────────────────────────────────── */

/** The local player. Never index players[0] outside this helper. */
export function me(run) {
  return run ? run.players[0] : null;
}

export function activeRuleset() {
  const run = state.run;
  if (run && run.ruleset) return run.ruleset;
  return effectiveRuleset(state.lab);
}

export function currentRanks() {
  const t = state.turn;
  if (!t) return [0, 0, 0, 0, 0];
  return t.slots.map((s) => (s ? s.rank : 0));
}

export function currentTileValues() {
  const t = state.turn;
  if (!t) return [];
  return t.slots.map((s) => (s ? s.tileValue : 0));
}

export function currentRedTileSlots() {
  const t = state.turn;
  if (!t) return [];
  return t.slots.map((s) => !!(s && s.hasRedTile));
}

export function previewScores() {
  const t = state.turn;
  const run = state.run;
  if (!t || !run) return {};
  return evaluate(run.ruleset, currentRanks(), {
    tileValues: currentTileValues(),
    redTileSlots: currentRedTileSlots()
  });
}

/** What the Dictionary Miss Penalty variant has cost this run so far. */
export function missPenaltyFor(run) {
  const rules = run.ruleset.dictionaryMissPenalty;
  if (!run.ruleset.experimentalVariants.dictionaryMissPenalty || !rules) return 0;
  const extra = Math.max(0, (me(run).dictionaryMisses || 0) - rules.maximumFreeMisses);
  return extra * rules.pointsPerExtraMiss;
}

export function totals(run = state.run) {
  if (!run) return null;
  const p = me(run);
  return cardTotals(
    run.ruleset,
    p.card,
    run.difficulty,
    p.wordBank,
    p.jumboPoints,
    missPenaltyFor(run)
  );
}

export function placedLetterCount(turn = state.turn) {
  if (!turn) return 0;
  return turn.slots.reduce((a, s) => a + (s ? s.word.length : 0), 0);
}

export function looseCount(turn = state.turn) {
  if (!turn) return 0;
  return turn.loose.length + turn.build.length;
}

export function refreshCap() {
  return activeRuleset().refresh.maximumTiles;
}

export function hintCost() {
  return activeRuleset().wordBank.hintCost;
}

export function hintsLeft() {
  const run = state.run;
  if (!run) return 0;
  return activeRuleset().wordBank.maximumHints - me(run).hintsUsed;
}

/* ── Persistence ─────────────────────────────────────────────────────────── */

function autosave() {
  if (state.run && state.turn) {
    write(KEYS.save, { run: state.run, turn: state.turn });
  } else {
    remove(KEYS.save);
  }
}

export function saveSettings(patch) {
  const settings = { ...state.settings, ...patch };
  set({ settings });
  write(KEYS.settings, settings);
  applyChrome(settings);
  configureAudio(settings);
  if (patch.dictionaryId && patch.dictionaryId !== state.dict.id) ensureDictionary(patch.dictionaryId);
}

/* ── Action log (PRD §13.5) ──────────────────────────────────────────────── */

function logAction(type, payload = {}) {
  if (!state.run) return;
  const entry = { t: Date.now(), turnNo: state.run.turnNo, type, ...payload };
  state.run.log.push(entry);
  if (state.run.log.length > 6000) state.run.log.splice(0, 1000);
}

function markInterrupted() {
  if (!state.run) return;
  state.run.interrupted = true;
  logAction('interrupted', { reason: 'app_reloaded' });
}

/* ── Navigation ──────────────────────────────────────────────────────────── */

export function go(screen) {
  // Leaving the board never ends the run. Coming back never starts a new one.
  // The clock stops while you are elsewhere and the pause is recorded, so a
  // future competitive mode can apply a stricter policy than Phase 1 needs to.
  if (state.screen === 'game' && screen !== 'game' && state.turn && !state.turn.expired) {
    logAction('paused', { secondsLeft: state.turn.secondsLeft });
  }
  if (screen === 'game' && state.screen !== 'game' && state.turn) {
    logAction('resumed', { secondsLeft: state.turn.secondsLeft });
  }
  set({ screen, helpTip: null, hoverTip: null });
}

export function goPlay() {
  if (state.run && state.turn && !state.run.completedAt) {
    set({ screen: 'game', helpTip: null, hoverTip: null });
  } else {
    set({ screen: 'setup', setup: { ...state.setup, seed: state.setup.seed || newSeed() }, helpTip: null, hoverTip: null });
  }
}

export function requestNewRun() {
  if (state.run && state.turn && !state.run.completedAt) {
    set({ modal: { type: 'run-in-progress' } });
  } else {
    set({ screen: 'setup', setup: freshSetup() });
  }
}

export function discardRunAndSetUp() {
  logAction('run_abandoned', {});
  remove(KEYS.save);
  set({ run: null, turn: null, modal: null, screen: 'setup', setup: freshSetup() });
}

export function requestAbandonRun() {
  if (state.run && state.turn && !state.run.completedAt) {
    set({ modal: { type: 'abandon-run' } });
  }
}

export function abandonRun() {
  logAction('run_abandoned', {});
  remove(KEYS.save);
  set({ run: null, turn: null, modal: null, screen: 'home' });
}

/**
 * @param action optional { label, onClick } — used for the three-second undo
 *        banner after a word is placed (README, "Placing a word": no
 *        confirmation dialog, a brief lock animation and an undo banner).
 */
export function toast(message, ms = 3200, action = null) {
  set({ toast: action ? { message, action } : { message } });
  clearTimeout(toast._t);
  toast._t = setTimeout(() => set({ toast: null }), ms);
}

export function closeModal() {
  set({ modal: null });
}

export function showHelp(key, anchor) {
  set({ helpTip: state.helpTip && state.helpTip.key === key ? null : { key, anchor } });
}

export function hideHelp() {
  if (state.helpTip) set({ helpTip: null });
}

/**
 * Hover tooltips, kept in their own slot so they never fight the click-to-open
 * help popover. Content is passed inline rather than by key, because most of
 * these explain a live number — what this hand would score, and why.
 */
export function showTip(item, anchor) {
  if (!item) return;
  set({ hoverTip: { item, anchor } });
}

export function hideTip() {
  if (state.hoverTip) set({ hoverTip: null });
}

export function cycleTheme() {
  const order = ['feltwork', 'midnight', 'sandbar'];
  const next = order[(order.indexOf(state.settings.theme) + 1) % order.length];
  saveSettings({ theme: next });
}

/* ── Setup ───────────────────────────────────────────────────────────────── */

export function setSetup(patch) {
  set({ setup: { ...state.setup, ...patch } });
}

export function rerollSeed() {
  set({ setup: { ...state.setup, seed: newSeed(), seedInput: '', seedError: null } });
}

export function toggleCustomRules() {
  const enabled = !state.lab.enabled;
  set({ lab: { ...state.lab, enabled } });
}

export function setLabValue(key, value) {
  const values = { ...state.lab.values, [key]: value };
  const lab = { enabled: labIsModified(values), values };
  set({ lab });
  write(KEYS.lab, values);
}

/**
 * Carry a variant's balance numbers and dependencies along with its switch.
 *
 * A number only moves when it is still sitting where the opposite state left it
 * — a slider the player moved by hand is theirs. Because the rule is symmetric
 * rather than anchored on the defaults, toggling a variant off and back on
 * always lands exactly where it started, which is what keeps a round trip from
 * flagging the run Custom forever. Mutates `values`; pass a copy.
 */
function applyVariantPreset(values, key, on) {
  const preset = VARIANT_PRESETS[key];
  if (!preset) return [];
  const r = standardRuleset();
  const seeded = preset(r, on);
  const opposite = preset(r, !on);
  const moved = [];

  for (const k of Object.keys(seeded)) {
    if (k === 'variants') continue;
    if (values[k] === opposite[k] && seeded[k] !== opposite[k]) {
      values[k] = seeded[k];
      moved.push(k);
    }
  }
  for (const k of Object.keys(seeded.variants || {})) {
    const want = seeded.variants[k];
    if (values.variants[k] === want) continue;
    values.variants = { ...values.variants, [k]: want };
    moved.push(...applyVariantPreset(values, k, want));
  }
  return moved;
}

export function setLabVariant(key, value) {
  const current = state.lab.values;
  // Dependencies hold their prerequisites on. The Lab disables those switches,
  // so reaching here means something else called in — refuse rather than
  // silently producing a variant that cannot work.
  if (!value && lockedVariants(current.variants)[key]) return;

  const values = { ...current, variants: { ...current.variants, [key]: value } };
  const moved = applyVariantPreset(values, key, value);

  const lab = { enabled: labIsModified(values), values };
  set({ lab });
  write(KEYS.lab, values);

  if (values.variants.tileValueScoring && !current.variants.tileValueScoring && key !== 'tileValueScoring') {
    toast('Tile Value Scoring switched on — Red Tile multiplies a tile-value payout.');
  } else if (moved.includes('upperBonusPoints')) {
    const raised = values.upperBonusPoints > current.upperBonusPoints;
    toast(`Upper bonus ${raised ? 'raised' : 'restored'} to ${values.upperBonusPoints} to match.`);
  }
}

export function resetLab() {
  const values = labDefaults();
  set({ lab: { enabled: false, values } });
  write(KEYS.lab, values);
  toast('Gameplay Lab reset to Standard Rules.');
}

/* ── Starting a run ──────────────────────────────────────────────────────── */

export function startRun(options = {}) {
  const setup = state.setup;
  const ruleset = effectiveRuleset(state.lab);
  const standard = standardRuleset();

  let seed = setup.seed;
  if (setup.seedInput && setup.seedInput.trim()) {
    const parsed = normaliseSeed(setup.seedInput);
    if (!parsed) {
      setSetup({ seedError: 'That run code does not look right. Use letters and numbers, like RF-7K4M2.' });
      play('invalid');
      return;
    }
    seed = parsed;
  }
  if (options.seed) seed = options.seed;

  const difficulty = options.difficulty || setup.difficulty;
  const timing = options.timing || setup.timing;
  const budget = ruleset.difficulty[difficulty].budget;
  const dictMeta = dictionaryMeta(state.settings.dictionaryId);

  const run = {
    runId: 'r' + Date.now().toString(36),
    seed,
    difficulty,
    budget,
    timing,
    gameLength: 'full',
    mode: 'solo',
    matchId: null,
    isCustom: state.lab.enabled,
    rulesetVersion: ruleset.rulesetVersion,
    rngVersion: standard.rngVersion,
    dictionaryId: dictMeta.id,
    dictionaryVersion: dictCache && dictCache.id === dictMeta.id ? dictCache.version : dictMeta.id,
    strictDictionary: state.settings.strictDictionary,
    tileDistributionId: standard.tileDistribution.id,
    tileDistributionVersion: standard.tileDistribution.version,
    ruleset,
    players: [
      {
        playerId: 'local-player',
        card: emptyCard(),
        wordBank: 0,
        jumboClaimed: false,
        jumboPoints: 0,
        jumboWord: '',
        hintsUsed: 0,
        hintPointsSpent: 0,
        dictionaryMisses: 0
      }
    ],
    redTilesSeen: 0,
    turnNo: 1,
    history: [],
    log: [],
    interrupted: false,
    startedAt: Date.now(),
    completedAt: null,
    finalScore: null
  };

  set({ run, turn: null, screen: 'game', modal: null, helpCat: null, lastResult: null });
  logAction('run_started', { seed, difficulty, timing, budget, isCustom: run.isCustom });
  play('gameStart');
  beginTurn(1);
}

export function beginTurn(turnNo, carried = []) {
  const run = state.run;
  const ruleset = run.ruleset;
  const need = run.budget - carried.length;
  const redTilesLeft = ruleset.redTile
    ? ruleset.redTile.maximumPerGame - (run.redTilesSeen || 0)
    : 0;
  const { rack, queue } = drawTurn(ruleset, run.seed, turnNo, need, { redTilesLeft });
  const seconds = ruleset.timingSeconds[run.timing];

  const turn = {
    turnNo,
    loose: carried.concat(rack),
    build: [],
    slots: [null, null, null, null, null],
    discarded: [],
    queue,
    queueIndex: 0,
    refreshesLeft: ruleset.refresh.count,
    secondsLeft: seconds === null ? null : seconds,
    expired: false,
    mode: 'build',
    refreshSel: [],
    hintWord: null,
    error: null,
    intendedCategory: null,
    postRefreshCategory: null,
    startedAt: Date.now(),
    powerSwapAvailable: false,
    powerSwapUsed: false
  };

  const wantsIntent =
    state.settings.instrumentation || ruleset.experimentalVariants.blindDeclaration;

  const drewRed = rack.some((t) => t.red);

  set({
    turn,
    run: drewRed ? { ...run, redTilesSeen: (run.redTilesSeen || 0) + 1 } : run,
    modal: wantsIntent
      ? { type: ruleset.experimentalVariants.blindDeclaration ? 'declare' : 'intent' }
      : null,
    helpCat: null
  });
  assertBudget(turn, run.budget, 'beginTurn');
  logAction('turn_started', {
    turnNo,
    rack: rack.map((t) => (t.blank ? '_' : t.letter)).join(''),
    redTile: drewRed ? rack.find((t) => t.red).letter : null
  });
  if (drewRed) {
    const mult = ruleset.redTile.multiplier;
    toast(
      `Red tile in your rack — a word using it pays ${mult}× whatever lower-section category it qualifies.`,
      4500
    );
  }
  autosave();
}

export function resumeRun() {
  if (state.run && state.turn) {
    set({ screen: 'game' });
  } else {
    goPlay();
  }
}

/* ── Turn actions ────────────────────────────────────────────────────────── */

function updateTurn(patch, actionName) {
  const turn = { ...state.turn, ...patch };
  set({ turn });
  assertBudget(turn, state.run.budget, actionName);
  autosave();
  return turn;
}

export function tapLoose(id) {
  unlockAudio();
  const t = state.turn;
  if (!t || t.expired) return;

  if (t.mode === 'refresh') {
    const cap = refreshCap();
    const has = t.refreshSel.includes(id);
    if (!has && t.refreshSel.length >= cap) {
      toast(`You can replace at most ${cap} tiles in one refresh.`);
      return;
    }
    play(has ? 'tileReturn' : 'tilePick');
    updateTurn(
      { refreshSel: has ? t.refreshSel.filter((x) => x !== id) : t.refreshSel.concat([id]) },
      'toggleRefreshTile'
    );
    logAction(has ? 'refresh_tile_deselected' : 'refresh_tile_selected', { id });
    return;
  }

  if (t.powerSwapAvailable && !t.powerSwapUsed) {
    performPowerSwap(id);
    return;
  }

  const tile = t.loose.find((x) => x.id === id);
  if (!tile) return;
  play('tilePick');
  const next = updateTurn(
    { loose: t.loose.filter((x) => x.id !== id), build: t.build.concat([tile]), error: null },
    'tapLoose'
  );
  logAction('tile_selected', { id, letter: tile.blank ? '_' : tile.letter });
  if (tile.blank) set({ modal: { type: 'blank', tileId: tile.id } });
  return next;
}

export function tapBuild(id) {
  const t = state.turn;
  if (!t) return;
  const tile = t.build.find((x) => x.id === id);
  if (!tile) return;
  play('tileReturn');
  const back = tile.blank ? { ...tile, letter: '' } : tile;
  updateTurn(
    { build: t.build.filter((x) => x.id !== id), loose: t.loose.concat([back]), error: null },
    'tapBuild'
  );
  logAction('tile_deselected', { id });
}

/** Reorder within the Build Bar. Always composes off the latest order. */
export function moveBuild(from, to) {
  if (from === null || to === null || from === to) return;
  const t = state.turn;
  if (!t || t.expired) return;
  if (from < 0 || to < 0 || from >= t.build.length || to >= t.build.length) return;
  const build = t.build.slice();
  const [moved] = build.splice(from, 1);
  build.splice(to, 0, moved);
  updateTurn({ build, error: null }, 'moveBuild');
}

/** Reorder within the loose rack, so the rack can be arranged by hand too. */
export function moveLoose(fromId, toId) {
  const t = state.turn;
  if (!t || fromId === toId) return;
  const loose = t.loose.slice();
  const from = loose.findIndex((x) => x.id === fromId);
  const to = loose.findIndex((x) => x.id === toId);
  if (from < 0 || to < 0) return;
  const [moved] = loose.splice(from, 1);
  loose.splice(to, 0, moved);
  updateTurn({ loose }, 'moveLoose');
  if (state.settings.sort !== 'draw') saveSettings({ sort: 'draw' });
}

export function assignBlank(letter) {
  const t = state.turn;
  if (!t) return;
  const build = t.build.map((x) => (x.blank && !x.letter ? { ...x, letter } : x));
  updateTurn({ build }, 'assignBlank');
  set({ modal: null });
  play('select');
  logAction('blank_assigned', { letter });
}

export function reassignBlank(tileId, letter) {
  const t = state.turn;
  if (!t) return;
  const build = t.build.map((x) => (x.id === tileId ? { ...x, letter } : x));
  updateTurn({ build }, 'reassignBlank');
  set({ modal: null });
  logAction('blank_assigned', { letter, tileId });
}

export function undoBuild() {
  const t = state.turn;
  if (!t || !t.build.length) return;
  tapBuild(t.build[t.build.length - 1].id);
}

export function clearBuild() {
  const t = state.turn;
  if (!t || !t.build.length) return;
  play('tileReturn');
  const back = t.build.map((x) => (x.blank ? { ...x, letter: '' } : x));
  updateTurn({ build: [], loose: t.loose.concat(back), error: null }, 'clearBuild');
}

/**
 * Count a word that simply is not in the dictionary, and return the sentence
 * that goes on the end of the rejection message.
 *
 * The count belongs in that message rather than a toast: it is the same place
 * the player is already looking, it survives as long as the error does, and it
 * lets them see the threshold coming instead of discovering the bill on the
 * Results screen. Returns null when the variant is off, so the message is
 * unchanged for everyone else.
 */
function chargeDictionaryMiss() {
  const run = state.run;
  const rules = run.ruleset.dictionaryMissPenalty;
  if (!run.ruleset.experimentalVariants.dictionaryMissPenalty || !rules) return null;

  const player = me(run);
  const misses = (player.dictionaryMisses || 0) + 1;
  const players = run.players.slice();
  players[0] = { ...player, dictionaryMisses: misses };
  set({ run: { ...run, players } });

  const free = rules.maximumFreeMisses;
  if (misses <= free) {
    return ` Incorrect attempt ${misses} of ${free}.`;
  }
  const over = misses - free;
  const cost = over * rules.pointsPerExtraMiss;
  return ` Incorrect attempt ${misses} — ${over} past the ${free} free, costing ${cost} points.`;
}

export function placeWord() {
  const t = state.turn;
  const run = state.run;
  if (!t || !run || t.expired) return;

  const check = validatePlacement({
    ruleset: run.ruleset,
    build: t.build,
    slots: t.slots,
    strict: state.settings.strictDictionary,
    dict: dictCache && dictCache.id === state.settings.dictionaryId ? dictCache : null
  });
  if (!check.ok) {
    play('invalid');
    // Charge first — the count it returns goes on the end of the message the
    // player is about to read.
    const missNote = check.code === 'notAWord' ? chargeDictionaryMiss() : null;
    updateTurn({ error: check.reason + (missNote || '') }, 'placeWord:invalid');
    logAction('word_rejected', { reason: check.reason, code: check.code });
    return;
  }

  const index = t.slots.findIndex((s) => !s);
  const slot = {
    word: check.word,
    letters: t.build.map((x) => ({ c: x.letter, blank: x.blank, red: !!x.red })),
    rank: lengthToRank(run.ruleset, check.word.length),
    tileValue: t.build.reduce((a, x) => a + (x.blank ? 0 : x.value), 0),
    hasRedTile: t.build.some((x) => x.red),
    provisional: true,
    tiles: t.build.slice()
  };
  const slots = t.slots.slice();
  slots[index] = slot;

  // Power Letters (experimental, off by default): the first word each turn
  // containing a real J, Q, X or Z earns one free single-tile swap.
  const powerLetters = run.ruleset.experimentalVariants.powerLetters;
  const earnsSwap =
    powerLetters &&
    !t.powerSwapUsed &&
    !t.powerSwapAvailable &&
    slot.letters.some((L) => !L.blank && 'JQXZ'.includes(L.c));

  play('place');
  updateTurn(
    { slots, build: [], error: null, powerSwapAvailable: earnsSwap || t.powerSwapAvailable },
    'placeWord'
  );
  set({ helpCat: null });
  logAction('word_placed', { word: slot.word, rank: slot.rank, tileValue: slot.tileValue, slot: index });
  announce(`${slot.word} placed in slot ${index + 1}. ${slot.word.length} letters, rank ${slot.rank}.`);
  if (earnsSwap) {
    toast('Power Letters: tap any loose tile for one free swap.');
  } else {
    // No confirmation dialog on placing — the word is provisional anyway. A
    // brief undo banner covers the misplaced tap.
    toast(
      `${slot.word} placed · ${slot.word.length} letters → rank ${slot.rank} · tile value ${slot.tileValue}`,
      3000,
      { label: 'Undo', onClick: () => dismantle(index) }
    );
  }
}

export function dismantle(index) {
  const t = state.turn;
  if (!t || t.expired) return;
  const slot = t.slots[index];
  if (!slot || !slot.provisional) return;
  play('dismantle');
  const back = slot.tiles.map((x) => (x.blank ? { ...x, letter: '' } : x));
  const slots = t.slots.slice();
  slots[index] = null;
  updateTurn({ slots, loose: t.loose.concat(back), error: null }, 'dismantle');
  set({ helpCat: null });
  logAction('word_removed', { word: slot.word, slot: index });
  announce(`${slot.word} dismantled. Its letters are back in the rack.`);
}

/* ── Refresh ─────────────────────────────────────────────────────────────── */

export function enterRefresh() {
  const t = state.turn;
  if (!t || !t.refreshesLeft || t.expired) return;
  // Build Bar tiles were always loose — return them so they can be discarded too.
  const back = t.build.map((x) => (x.blank ? { ...x, letter: '' } : x));
  updateTurn(
    { mode: 'refresh', refreshSel: [], build: [], loose: t.loose.concat(back), error: null },
    'enterRefresh'
  );
  play('select');
}

export function cancelRefresh() {
  const t = state.turn;
  if (!t) return;
  updateTurn({ mode: 'build', refreshSel: [] }, 'cancelRefresh');
  set({ modal: null });
}

export function askRefresh() {
  const t = state.turn;
  if (!t || !t.refreshSel.length) return;
  set({ modal: { type: 'refresh' } });
}

export function confirmRefresh() {
  const t = state.turn;
  const run = state.run;
  if (!t) return;

  const asked = t.refreshSel.length;
  const incoming = t.queue.slice(t.queueIndex, t.queueIndex + asked);
  // The replacement queue is finite. Never discard more tiles than we can
  // replace — loose + placed must always equal the turn budget.
  const n = incoming.length;
  const discardIds = t.refreshSel.slice(0, n);
  const discarded = t.loose.filter((x) => discardIds.includes(x.id));
  const loose = t.loose.filter((x) => !discardIds.includes(x.id)).concat(incoming);
  const slots = t.slots.map((s) => (s ? { ...s, provisional: false } : s));
  const madePermanent = t.slots.filter((s) => s && s.provisional).length;

  play('refresh');
  updateTurn(
    {
      loose,
      slots,
      discarded: t.discarded.concat(discarded),
      queueIndex: t.queueIndex + n,
      refreshesLeft: t.refreshesLeft - 1,
      mode: 'build',
      refreshSel: []
    },
    'confirmRefresh'
  );
  set({ modal: null });
  logAction('refresh_confirmed', { tiles: n, madePermanent, refreshesLeft: t.refreshesLeft - 1 });
  announce(
    madePermanent
      ? `${n} tiles replaced. ${madePermanent} word${madePermanent === 1 ? '' : 's'} now permanent.`
      : `${n} tiles replaced.`
  );
  toast(
    `${n} tile${n === 1 ? '' : 's'} replaced.` +
      (madePermanent ? ' Placed words are now permanent.' : '') +
      (n < asked ? ' (The replacement queue ran short at these Lab settings.)' : '')
  );

  // Instrumentation: after the first refresh, record the category now considered.
  if (state.settings.instrumentation && t.refreshesLeft - 1 === run.ruleset.refresh.count - 1) {
    set({ modal: { type: 'intent', post: true } });
  }
}

function performPowerSwap(id) {
  const t = state.turn;
  const incoming = t.queue.slice(t.queueIndex, t.queueIndex + 1);
  if (!incoming.length) {
    toast('No replacement tiles left in the queue.');
    return;
  }
  const loose = t.loose.filter((x) => x.id !== id).concat(incoming);
  play('refresh');
  updateTurn(
    { loose, queueIndex: t.queueIndex + 1, powerSwapAvailable: false, powerSwapUsed: true },
    'powerSwap'
  );
  logAction('power_letter_swap', { id });
  toast('Power Letters swap used. The budget is unchanged.');
}

/* ── Hints ───────────────────────────────────────────────────────────────── */

export function openHint() {
  const t = state.turn;
  const run = state.run;
  if (!t || !run || t.expired) return;
  const ruleset = run.ruleset;
  const player = me(run);
  if (player.hintsUsed >= ruleset.wordBank.maximumHints) return;
  if (player.wordBank < ruleset.wordBank.hintCost) {
    toast(
      `A hint costs ${ruleset.wordBank.hintCost} Word Bank points and your bank holds ${player.wordBank}. Bank a word first.`
    );
    play('invalid');
    return;
  }
  set({ modal: { type: 'hint' } });
}

export function buyHint(length) {
  const t = state.turn;
  const run = state.run;
  if (!t || !run) return;
  const ruleset = run.ruleset;
  const cost = ruleset.wordBank.hintCost;
  const dict = dictCache && dictCache.id === state.settings.dictionaryId ? dictCache : null;

  const result = findHint({ dict, tiles: t.loose.concat(t.build), length });
  const player = me(run);
  const players = run.players.slice();
  players[0] = {
    ...player,
    wordBank: Math.max(0, player.wordBank - cost),
    hintsUsed: player.hintsUsed + 1,
    hintPointsSpent: player.hintPointsSpent + Math.min(cost, player.wordBank)
  };

  play('hint');
  set({
    run: { ...run, players },
    turn: { ...t, hintWord: result.word || null, hintReason: result.reason || null },
    modal: { type: 'hint-result' }
  });
  logAction('hint_purchased', { length, word: result.word || null, cost });
  autosave();
}

/* ── Scoring ─────────────────────────────────────────────────────────────── */

export function selectCategory(key) {
  const run = state.run;
  if (!run || me(run).card[key] !== null) return;
  play('select');
  set({ helpCat: state.helpCat === key ? null : key });
  logAction('category_considered', { category: key });
}

export function clearSelection() {
  set({ helpCat: null });
}

export function confirmScore() {
  const key = state.helpCat;
  if (!key) return;
  set({ helpCat: null });
  scoreCategory(key);
}

function bankedWordFor(ruleset, filled) {
  if (!filled.length) return { word: null, value: 0, note: '' };
  const sorted = filled.slice().sort((a, b) => b.tileValue - a.tileValue);
  switch (ruleset.wordBank.method) {
    case 'top_two_half_value': {
      const top = sorted.slice(0, 2);
      const value = top.reduce((a, s) => a + Math.floor(s.tileValue / 2), 0);
      return { word: top.map((s) => s.word).join(' + '), value, note: 'two best at half value' };
    }
    case 'highest_capped_20': {
      const value = Math.min(20, sorted[0].tileValue);
      return { word: sorted[0].word, value, note: 'highest word, capped at 20' };
    }
    default:
      return { word: sorted[0].word, value: sorted[0].tileValue, note: '' };
  }
}

export function scoreCategory(key) {
  const t = state.turn;
  const run = state.run;
  if (!t || !run) return;
  const player = me(run);
  if (player.card[key] !== null) return;

  const ruleset = run.ruleset;
  const slots = t.slots.map((s) => (s ? { ...s, provisional: false } : s));
  const filled = slots.filter(Boolean);
  const ranks = slots.map((s) => (s ? s.rank : 0));
  const redTileSlots = slots.map((s) => !!(s && s.hasRedTile));
  const preview = evaluate(ruleset, ranks, {
    tileValues: slots.map((s) => (s ? s.tileValue : 0)),
    redTileSlots
  });

  let points = preview[key] || 0;
  let halved = false;
  // Blind Declaration (experimental): the declared category scores full value,
  // anything else scores half.
  if (ruleset.experimentalVariants.blindDeclaration && t.intendedCategory && t.intendedCategory !== key) {
    points = Math.floor(points / 2);
    halved = true;
  }

  const bank = bankedWordFor(ruleset, filled);
  const jumboMin = ruleset.jumbo.minimumLength;
  const jumboCandidate = player.jumboClaimed
    ? null
    : filled.find((s) => s.word.length >= jumboMin) || null;
  const jumboPoints = jumboCandidate
    ? jumboCandidate.word.length * ruleset.jumbo.pointsPerLetter
    : player.jumboPoints;

  const card = { ...player.card, [key]: points };
  const players = run.players.slice();
  players[0] = {
    ...player,
    card,
    wordBank: player.wordBank + bank.value,
    jumboClaimed: player.jumboClaimed || !!jumboCandidate,
    jumboPoints,
    jumboWord: jumboCandidate ? jumboCandidate.word : player.jumboWord
  };

  const record = {
    turnNo: run.turnNo,
    words: filled.map((s) => s.word),
    lengths: filled.map((s) => s.word.length),
    tileValues: filled.map((s) => s.tileValue),
    redTileSlots,
    ranks,
    category: key,
    categoryPoints: points,
    halved,
    bankedWord: bank.word,
    bankedWordValue: bank.value,
    jumboAwarded: !!jumboCandidate,
    jumboLength: jumboCandidate ? jumboCandidate.word.length : 0,
    intendedCategory: t.intendedCategory,
    postRefreshCategory: t.postRefreshCategory,
    refreshesUsed: ruleset.refresh.count - t.refreshesLeft,
    tilesRefreshed: t.queueIndex,
    hintsUsed: me(run).hintsUsed,
    emptySlots: slots.filter((s) => !s).length,
    durationSeconds: Math.round((Date.now() - t.startedAt) / 1000),
    feeling: null,
    resultLine: describeScore(key, ranks, points, {
      tileValueScoring: !!ruleset.experimentalVariants.tileValueScoring,
      tileValue: filled.reduce((a, s) => a + s.tileValue, 0),
      redTileMultiplier: redTileApplies(ruleset, key, ranks, redTileSlots)
        ? ruleset.redTile.multiplier
        : 0
    })
  };

  const nextRun = {
    ...run,
    players,
    history: run.history.concat([record])
  };

  play(jumboCandidate ? 'jumbo' : 'score');
  set({
    run: nextRun,
    turn: { ...t, slots },
    modal: { type: jumboCandidate ? 'jumbo' : 'turn-summary' }
  });
  logAction('category_scored', { category: key, points, banked: bank.word, bankedValue: bank.value });
  announce(record.resultLine);
  autosave();
}

/** Jumbo modal → turn summary → next turn (or results). */
export function advance() {
  const run = state.run;
  if (!run) return;
  if (state.modal && state.modal.type === 'jumbo') {
    set({ modal: { type: 'turn-summary' } });
    return;
  }
  if (state.settings.instrumentation && state.modal && state.modal.type === 'turn-summary') {
    set({ modal: { type: 'feeling' } });
    return;
  }
  nextTurn();
}

export function recordFeeling(feeling) {
  const run = state.run;
  if (run && run.history.length) {
    run.history[run.history.length - 1].feeling = feeling;
    logAction('turn_feeling', { feeling });
  }
  nextTurn();
}

function nextTurn() {
  const run = state.run;
  const player = me(run);
  if (cardComplete(player.card)) {
    finishRun();
    return;
  }
  const carried = run.ruleset.experimentalVariants.carryOver
    ? state.turn.loose.slice(0, 5).map((tile) => (tile.blank ? { ...tile, letter: '' } : tile))
    : [];
  const nextRun = { ...run, turnNo: run.turnNo + 1 };
  set({ run: nextRun, modal: null });
  beginTurn(nextRun.turnNo, carried);
}

function finishRun() {
  const run = state.run;
  const t = totals(run);
  const completed = {
    ...run,
    completedAt: Date.now(),
    finalScore: t.total
  };
  play('finish');
  set({
    run: completed,
    turn: null,
    modal: { type: 'name-entry' },
    screen: 'results',
    pendingEntry: { run: completed, totals: t },
    nameDraft: '',
    lastEntryId: null,
    lastResult: { totals: t, entry: null }
  });
  logAction('run_completed', { finalScore: t.total });
  remove(KEYS.save);
  archivePlaytestRun(completed, t);
}

export function setNameDraft(value) {
  set({ nameDraft: value.slice(0, 24) });
}

/** Player typed a name/initials and wants their run on the local leaderboard. */
export function submitLeaderboardEntry() {
  const pending = state.pendingEntry;
  if (!pending) return;
  const name = state.nameDraft.trim();
  if (!name) return;
  const entry = recordLeaderboardEntry(pending.run, pending.totals, name);
  set({ modal: null, pendingEntry: null, lastEntryId: entry.id, lastResult: { totals: pending.totals, entry } });
  logAction('leaderboard_entry_submitted', {});
}

/** Player chose not to have this run recorded on the local leaderboard. */
export function skipLeaderboardEntry() {
  if (!state.pendingEntry) return;
  set({ modal: null, pendingEntry: null });
  logAction('leaderboard_entry_skipped', {});
}

function recordLeaderboardEntry(run, t, name) {
  const player = me(run);
  const best = run.history.reduce(
    (a, h) => (h.bankedWordValue > a.value ? { word: h.bankedWord, value: h.bankedWordValue } : a),
    { word: null, value: 0 }
  );
  const entry = {
    id: run.runId,
    name,
    bestWord: best.word,
    bestWordValue: best.value,
    jumboWord: player.jumboWord,
    score: t.total,
    difficulty: run.difficulty,
    timing: run.timing,
    date: Date.now(),
    seed: run.seed,
    rulesetVersion: run.rulesetVersion,
    dictionaryId: run.dictionaryId,
    dictionaryVersion: run.dictionaryVersion,
    scorecard: t.scorecard,
    upperBonus: t.bonus,
    wordBank: player.wordBank,
    jumbo: player.jumboPoints,
    hints: player.hintsUsed,
    durationMinutes: Math.max(1, Math.round((run.completedAt - run.startedAt) / 60000)),
    interrupted: !!run.interrupted,
    isCustom: !!run.isCustom,
    // Custom runs share one board, so say which rules were in play — a tile-value
    // run and a carry-over run are not comparable to each other either.
    variantTag: variantTag(run.ruleset.experimentalVariants)
  };
  const leaderboard = mergeBoards(state.leaderboard, [entry]);
  set({ leaderboard });
  write(KEYS.leaderboard, leaderboard);
  pushRemote(leaderboard);
  return entry;
}

/* ── Timer ───────────────────────────────────────────────────────────────── */

export function tick() {
  const s = state;
  if (s.screen !== 'game' || !s.turn || s.modal || s.turn.secondsLeft === null) return;
  if (s.turn.expired || s.turn.secondsLeft <= 0) return;
  const next = s.turn.secondsLeft - 1;
  if (next > 0) {
    const warnAt = s.run.ruleset.timingSeconds.warningThreshold;
    if (next === warnAt) play('warn');
    else if (next <= 5) play('tick');
    set({ turn: { ...s.turn, secondsLeft: next } });
    return;
  }
  expireTurn();
}

export function expireTurn() {
  const t = state.turn;
  if (!t) return;
  // At the buzzer: the Build Bar empties back into the loose pile, tile
  // interaction stops, and a category selection becomes required.
  const back = t.build.map((x) => (x.blank ? { ...x, letter: '' } : x));
  const slots = t.slots.map((s) => (s ? { ...s, provisional: false } : s));
  play('timeout');
  updateTurn(
    {
      secondsLeft: 0,
      expired: true,
      mode: 'build',
      build: [],
      refreshSel: [],
      loose: t.loose.concat(back),
      slots,
      error: null
    },
    'expireTurn'
  );
  set({ modal: { type: 'timeout' } });
  logAction('timer_expired', {});
  announce('Time is up. Empty slots score rank 0. Choose one category to finish the turn.');
}

/* ── Instrumentation ─────────────────────────────────────────────────────── */

export function recordIntent(categoryKey, post = false) {
  const t = state.turn;
  if (!t) return;
  updateTurn(
    post ? { postRefreshCategory: categoryKey } : { intendedCategory: categoryKey },
    'recordIntent'
  );
  set({ modal: null });
  logAction(post ? 'category_considered_after_refresh' : 'intent_selected', { category: categoryKey });
}

function archivePlaytestRun(run, t) {
  const player = me(run);
  const archive = read(KEYS.playtest) || [];
  archive.push({
    runId: run.runId,
    seed: run.seed,
    difficulty: run.difficulty,
    timing: run.timing,
    rulesetVersion: run.rulesetVersion,
    dictionaryId: run.dictionaryId,
    isCustom: run.isCustom,
    interrupted: run.interrupted,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationSeconds: Math.round((run.completedAt - run.startedAt) / 1000),
    scorecardTotal: t.scorecard,
    upperSubtotal: t.upper,
    upperBonus: t.bonus,
    wordBankTotal: player.wordBank,
    wordBankShare: t.total ? +(player.wordBank / t.total).toFixed(3) : 0,
    jumbo: player.jumboPoints,
    jumboWord: player.jumboWord,
    hintsUsed: player.hintsUsed,
    hintPointsSpent: player.hintPointsSpent,
    zeroedCategories: Object.keys(player.card).filter((k) => player.card[k] === 0),
    finalScore: t.total,
    turns: run.history,
    log: run.log
  });
  while (archive.length > 40) archive.shift();
  write(KEYS.playtest, archive);
}

export function exportPlaytestData() {
  const archive = read(KEYS.playtest) || [];
  const live =
    state.run && !state.run.completedAt
      ? [{ runId: state.run.runId, inProgress: true, turns: state.run.history, log: state.run.log }]
      : [];
  const payload = {
    exportedAt: new Date().toISOString(),
    rulesetVersion: standardRuleset().rulesetVersion,
    rngVersion: standardRuleset().rngVersion,
    settings: { ...state.settings },
    lab: state.lab,
    runs: archive.concat(live),
    leaderboard: state.leaderboard
  };
  const stamp = new Date().toISOString().slice(0, 10);
  download(`rack-five-playtest-${stamp}.json`, JSON.stringify(payload, null, 2));

  const header = [
    'runId', 'difficulty', 'timing', 'turnNo', 'words', 'lengths', 'ranks',
    'category', 'categoryPoints', 'bankedWord', 'bankedWordValue', 'refreshesUsed',
    'tilesRefreshed', 'hintsUsed', 'emptySlots', 'jumboAwarded', 'intendedCategory',
    'postRefreshCategory', 'durationSeconds', 'feeling'
  ];
  const rows = [header.join(',')];
  for (const run of archive) {
    for (const turn of run.turns || []) {
      rows.push(
        [
          run.runId, run.difficulty, run.timing, turn.turnNo,
          '"' + (turn.words || []).join(' ') + '"',
          '"' + (turn.lengths || []).join(' ') + '"',
          '"' + (turn.ranks || []).join(' ') + '"',
          turn.category, turn.categoryPoints, turn.bankedWord || '', turn.bankedWordValue,
          turn.refreshesUsed, turn.tilesRefreshed, turn.hintsUsed, turn.emptySlots,
          turn.jumboAwarded ? 1 : 0, turn.intendedCategory || '', turn.postRefreshCategory || '',
          turn.durationSeconds, turn.feeling || ''
        ].join(',')
      );
    }
  }
  download(`rack-five-turns-${stamp}.csv`, rows.join('\n'), 'text/csv');
  toast(`Exported ${archive.length} completed run${archive.length === 1 ? '' : 's'} as JSON + CSV.`);
}

/* ── Results actions ─────────────────────────────────────────────────────── */

export function replayRun() {
  const run = state.run;
  if (!run) return;
  set({
    setup: { ...freshSetup(), difficulty: run.difficulty, timing: run.timing, seed: run.seed }
  });
  startRun({ seed: run.seed, difficulty: run.difficulty, timing: run.timing });
}

export function shareSeed() {
  const run = state.run;
  if (!run) return;
  const t = totals(run);
  const code = `${run.seed}·${run.difficulty[0].toUpperCase()}·${run.rulesetVersion}`;
  const text = `Try my Rack Five run: ${cap(run.difficulty)}, ${cap(run.timing)}, seed ${run.seed}. I scored ${t.total}.`;
  const payload = `${text}\nRun code: ${code}`;
  if (navigator.share) {
    navigator.share({ title: 'Rack Five', text }).catch(() => copyShare(payload));
  } else {
    copyShare(payload);
  }
  logAction('seed_shared', { seed: run.seed });
}

function copyShare(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast('Run code copied — it carries the seed, difficulty and ruleset version.'))
      .catch(() => toast('Copy failed. Select the run code and copy it by hand.'));
  } else {
    toast('Clipboard unavailable — select the run code and copy it by hand.');
  }
}

export function playAnother() {
  set({ run: null, turn: null, screen: 'setup', setup: freshSetup(), lastResult: null });
}

export function clearLeaderboard() {
  set({ leaderboard: [] });
  write(KEYS.leaderboard, []);
  pushRemote([]);
  toast('Leaderboard cleared.');
}

/** Pull the server's copy, union it with what this browser has, push the result back. */
function syncLeaderboard() {
  fetchRemote()
    .then((remote) => {
      const merged = mergeBoards(state.leaderboard, remote);
      set({ leaderboard: merged });
      write(KEYS.leaderboard, merged);
      if (merged.length !== remote.length) pushRemote(merged);
    })
    .catch(() => {});
}

export function setLbView(patch) {
  set({ lbView: { ...state.lbView, ...patch } });
}

/* ── Accessibility announcements ─────────────────────────────────────────── */

let liveRegion = null;
export function announce(message) {
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = message; }, 30);
}

export function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

export { CATEGORIES, categoryName, DICTIONARIES };
