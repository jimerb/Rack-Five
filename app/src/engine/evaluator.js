// The scorecard evaluator. Rulebook §11: "roughly 80 lines, and it is the
// entire game."
//
// Takes five ranks, returns what every category pays. Qualification rules are
// written down rather than implied — undefined rules produce arguments and
// inconsistent implementations.
//
//   Three of a Kind  at least 3 of one rank; Four of a Kind and Rack Five qualify
//   Four of a Kind   at least 4 of one rank; Rack Five qualifies
//   Full House       exactly two distinct ranks, 3-and-2. A Rack Five does NOT qualify
//   Small Straight   4 distinct consecutive non-zero ranks; the fifth word can be anything
//   Large Straight   5 distinct consecutive non-zero ranks
//   Rank 0           never satisfies any pattern requirement
//
// The Tile Value Scoring variant changes what the lower section *pays*, never what
// it *requires*. Qualification below is computed once and is identical either way.

import { UPPER_KEYS } from './categories.js';

/** Everything about a hand that qualification and the red tile both need. */
function analyse(ranks) {
  const counts = {};
  for (const r of ranks) if (r > 0) counts[r] = (counts[r] || 0) + 1;

  const distinct = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b);
  const groupSizes = Object.values(counts);
  const hasZero = ranks.some((r) => r === 0);

  // Longest run of consecutive distinct non-zero ranks, and which ranks it is.
  let longestRun = distinct.length ? 1 : 0;
  let bestStart = 0;
  let start = 0;
  let run = 1;
  for (let i = 1; i < distinct.length; i++) {
    if (distinct[i] === distinct[i - 1] + 1) {
      run += 1;
    } else {
      run = 1;
      start = i;
    }
    if (run > longestRun) {
      longestRun = run;
      bestStart = start;
    }
  }

  return {
    sum: ranks.reduce((a, b) => a + b, 0),
    counts,
    distinct,
    largestGroup: groupSizes.length ? Math.max(...groupSizes) : 0,
    longestRun,
    runRanks: distinct.slice(bestStart, bestStart + longestRun),
    isFullHouse:
      !hasZero && distinct.length === 2 && groupSizes.includes(3) && groupSizes.includes(2),
    isRackFive: distinct.length === 1 && counts[distinct[0]] === ranks.length
  };
}

/**
 * The ranks a category's qualification actually rests on. Three of a Kind rests
 * on the tripled rank alone; a straight rests on its run. This is what makes the
 * red tile a decision — it pays for being built into a word that carries the
 * category, not for being spent anywhere at all.
 */
function qualifyingRanks(key, a) {
  switch (key) {
    case 'threeKind':
      return a.distinct.filter((r) => a.counts[r] >= 3);
    case 'fourKind':
      return a.distinct.filter((r) => a.counts[r] >= 4);
    case 'smallStraight':
    case 'largeStraight':
      return a.runRanks;
    case 'fullHouse':
    case 'chance':
    case 'rackFive':
      return a.distinct;
    default:
      return [];
  }
}

/**
 * Whether a red tile multiplies this category. The `&& ruleset.redTile` half of
 * the guard is load-bearing for the same reason the Tile Value one is: a run
 * started before the variant existed resumes off a persisted ruleset with no
 * such block.
 */
export function redTileApplies(ruleset, key, ranks, redTileSlots = []) {
  const variants = ruleset.experimentalVariants || {};
  if (!variants.redTile || !ruleset.redTile) return false;
  if (UPPER_KEYS.includes(key)) return false;
  const redRanks = ranks.filter((r, i) => r > 0 && redTileSlots[i]);
  if (!redRanks.length) return false;
  return qualifyingRanks(key, analyse(ranks)).some((r) => redRanks.includes(r));
}

/**
 * @param ruleset  effective ruleset for the run
 * @param ranks    five ranks, 0 for an empty slot
 * @param options  { tileValues, redTileSlots } — the per-slot tile values, read
 *                 when the Tile Value Scoring variant is on, and which slots
 *                 hold a red tile, read when the Red Tile variant is on
 */
export function evaluate(ruleset, ranks, options = {}) {
  const a = analyse(ranks);
  const lower = ruleset.lowerSection;
  const out = {};

  // Tile Value Scoring. The `&& ruleset.tileValueScoring` half of the guard is
  // load-bearing: run.ruleset is a snapshot persisted into localStorage, so a
  // game started before this variant existed resumes with no such block.
  const variants = ruleset.experimentalVariants || {};
  const tileValue = (options.tileValues || []).reduce((a2, b) => a2 + b, 0);
  const tvs = !!(variants.tileValueScoring && ruleset.tileValueScoring);
  const mult = tvs ? ruleset.tileValueScoring.multipliers : null;
  const redSlots = options.redTileSlots || [];

  // Round here and nowhere else. Every consumer — the "+n" previews, the chip
  // sort, cardTotals, the Blind Declaration halving — assumes an integer.
  const pay = (key, standard) => {
    const base = tvs ? tileValue * mult[key] : standard;
    const red = redTileApplies(ruleset, key, ranks, redSlots) ? ruleset.redTile.multiplier : 1;
    return Math.round(base * red);
  };

  for (let rank = 1; rank <= UPPER_KEYS.length; rank++) {
    out[UPPER_KEYS[rank - 1]] = (a.counts[rank] || 0) * rank;
  }

  out.threeKind = a.largestGroup >= 3 ? pay('threeKind', a.sum) : 0;
  out.fourKind = a.largestGroup >= 4 ? pay('fourKind', a.sum) : 0;
  out.fullHouse = a.isFullHouse ? pay('fullHouse', lower.fullHouse) : 0;
  out.smallStraight = a.longestRun >= 4 ? pay('smallStraight', lower.smallStraight) : 0;
  out.largeStraight =
    a.distinct.length === 5 && a.longestRun >= 5 ? pay('largeStraight', lower.largeStraight) : 0;
  out.chance = pay('chance', a.sum);
  out.rackFive = a.isRackFive ? pay('rackFive', ruleset.rackFiveMultiplier * a.distinct[0]) : 0;

  return out;
}

/**
 * Plain-language result line — rulebook §11 requires one after scoring:
 * "Full House: three rank-4 words and two rank-2 words. +25"
 *
 * @param options  { tileValueScoring, tileValue, redTileMultiplier } — when Tile
 *                 Value Scoring is on, the lines that name the rank sum have to
 *                 name tile value instead. Defaults keep the original
 *                 three-argument call working.
 */
export function describeScore(key, ranks, points, options = {}) {
  const tvs = !!options.tileValueScoring;
  const tv = options.tileValue || 0;
  const red = options.redTileMultiplier
    ? ` A red tile carried it, for ${options.redTileMultiplier}×.`
    : '';
  const counts = {};
  for (const r of ranks) if (r > 0) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.keys(counts)
    .map(Number)
    .sort((a, b) => counts[b] - counts[a] || b - a);
  const words = (n) => ['no', 'one', 'two', 'three', 'four', 'five'][n] || String(n);
  const phrase = (rank) =>
    `${words(counts[rank])} rank-${rank} word${counts[rank] === 1 ? '' : 's'}`;
  const empties = ranks.filter((r) => r === 0).length;
  const tail =
    (empties ? ` ${empties} empty slot${empties === 1 ? '' : 's'} scored rank 0.` : '') + red;

  switch (key) {
    case 'fullHouse':
      return `Full House: ${groups.map(phrase).join(' and ')}. +${points}${red}`;
    case 'smallStraight':
    case 'largeStraight':
      return `${key === 'smallStraight' ? 'Small' : 'Large'} Straight: ranks ${ranks
        .filter((r) => r > 0)
        .sort((a, b) => a - b)
        .join('-')}. +${points}${red}`;
    case 'threeKind':
    case 'fourKind':
      return `${key === 'threeKind' ? 'Three' : 'Four'} of a Kind: ${phrase(groups[0])}, scoring ${
        tvs ? `on tile value ${tv}` : 'the sum of all five ranks'
      }. +${points}${tail}`;
    case 'rackFive':
      return points
        ? `Rack Five: all five words at rank ${groups[0]}${
            tvs ? `, scoring on tile value ${tv}` : ''
          }. +${points}${red}`
        : `Rack Five taken with a hand that does not qualify. +0${tail}`;
    case 'chance':
      return `Chance: ${
        tvs ? `tile value ${tv}, at three-quarters` : 'the sum of all five ranks'
      }. +${points}${tail}`;
    default:
      return points
        ? `${phrase(groups[0] || 1)} counted. +${points}${tail}`
        : `Nothing in this hand qualified. +0${tail}`;
  }
}

/**
 * Show the working behind a category's score, for the hover tooltips. Returns
 * { qualifies, lines: [[label, value]], note } — the arithmetic spelled out, so
 * a payout is never a number the player has to take on trust.
 */
export function explainScore(ruleset, key, ranks, tileValues = [], redTileSlots = []) {
  const points = evaluate(ruleset, ranks, { tileValues, redTileSlots })[key] || 0;
  const upperIndex = UPPER_KEYS.indexOf(key);
  const red = redTileApplies(ruleset, key, ranks, redTileSlots)
    ? ['Red tile bonus', `× ${ruleset.redTile.multiplier}`]
    : null;
  const live = ranks.filter((r) => r > 0);
  const empties = ranks.length - live.length;
  const emptyNote = empties
    ? empties === 1
      ? '1 empty slot counts as rank 0.'
      : `${empties} empty slots count as rank 0.`
    : null;

  if (upperIndex >= 0) {
    const rank = upperIndex + 1;
    const n = ranks.filter((r) => r === rank).length;
    return {
      qualifies: n > 0,
      lines: [
        [`Words of rank ${rank}`, n],
        ['Points per word', rank],
        ['Scores', points]
      ],
      note: n ? null : `No rank-${rank} words in this hand, so it would score 0.`
    };
  }

  const tvs = !!(
    ruleset.experimentalVariants &&
    ruleset.experimentalVariants.tileValueScoring &&
    ruleset.tileValueScoring
  );
  const tileTotal = tileValues.reduce((a, b) => a + b, 0);

  if (points === 0) {
    return {
      qualifies: false,
      lines: [['Scores', 0]],
      note: 'This hand does not qualify. You can still take the category, for 0.'
    };
  }

  const redNote = red ? 'A red tile is in a word this category rests on, so it pays double.' : null;

  if (tvs) {
    const m = ruleset.tileValueScoring.multipliers[key];
    return {
      qualifies: true,
      lines: [
        ['Tile value of all 5 words', tileTotal],
        ['Multiplier', `× ${m.toFixed(2)}`],
        ...(red ? [red] : []),
        ['Scores', points]
      ],
      note: redNote || emptyNote
    };
  }

  const sum = live.reduce((a, b) => a + b, 0);
  if (key === 'threeKind' || key === 'fourKind' || key === 'chance') {
    return {
      qualifies: true,
      lines: [['Ranks', live.join(' + ') || '0'], ...(red ? [red] : []), ['Scores', points]],
      note: redNote || emptyNote
    };
  }
  if (key === 'rackFive') {
    return {
      qualifies: true,
      lines: [
        ['All five words at rank', live[0]],
        ['Multiplier', `× ${ruleset.rackFiveMultiplier}`],
        ...(red ? [red] : []),
        ['Scores', points]
      ],
      note: redNote
    };
  }
  const flat = ruleset.lowerSection[key];
  return {
    qualifies: true,
    lines: red
      ? [['Fixed value when it qualifies', flat], red, ['Scores', points]]
      : [['Fixed value when it qualifies', points]],
    note:
      redNote ||
      `The pattern pays a flat ${points} whatever the ranks add up to (they total ${sum} here).`
  };
}

/**
 * Card totals. Upper bonus threshold is per-difficulty (rulebook §6: expect to
 * need three different thresholds once there is real data).
 */
export function cardTotals(
  ruleset,
  card,
  difficulty,
  wordBank = 0,
  jumboPoints = 0,
  missPenalty = 0
) {
  let upper = 0;
  let lower = 0;
  for (const key of Object.keys(card)) {
    const value = card[key];
    if (value === null) continue;
    if (UPPER_KEYS.includes(key)) upper += value;
    else lower += value;
  }
  const threshold = ruleset.difficulty[difficulty].upperBonusThreshold;
  const bonus = upper >= threshold ? ruleset.upperBonusPoints : 0;
  const scorecard = upper + bonus + lower;
  return {
    upper,
    lower,
    threshold,
    bonus,
    scorecard,
    wordBank,
    jumboPoints,
    missPenalty,
    total: scorecard + wordBank + jumboPoints - missPenalty
  };
}
