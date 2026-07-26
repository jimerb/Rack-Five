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

/**
 * @param ruleset  effective ruleset for the run
 * @param ranks    five ranks, 0 for an empty slot
 * @param options  { tileValues } — the per-slot tile values, read when the
 *                 Tile Value Scoring experimental variant is on
 */
export function evaluate(ruleset, ranks, options = {}) {
  const sum = ranks.reduce((a, b) => a + b, 0);

  const counts = {};
  for (const r of ranks) if (r > 0) counts[r] = (counts[r] || 0) + 1;

  const distinct = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b);
  const groupSizes = Object.values(counts);
  const largestGroup = groupSizes.length ? Math.max(...groupSizes) : 0;
  const hasZero = ranks.some((r) => r === 0);

  // Longest run of consecutive distinct non-zero ranks.
  let longestRun = distinct.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < distinct.length; i++) {
    run = distinct[i] === distinct[i - 1] + 1 ? run + 1 : 1;
    if (run > longestRun) longestRun = run;
  }

  const lower = ruleset.lowerSection;
  const out = {};

  // Tile Value Scoring. The `&& ruleset.tileValueScoring` half of the guard is
  // load-bearing: run.ruleset is a snapshot persisted into localStorage, so a
  // game started before this variant existed resumes with no such block.
  const variants = ruleset.experimentalVariants || {};
  const tileValue = (options.tileValues || []).reduce((a, b) => a + b, 0);
  const tvs = !!(variants.tileValueScoring && ruleset.tileValueScoring);
  const mult = tvs ? ruleset.tileValueScoring.multipliers : null;

  // Round here and nowhere else. Every consumer — the "+n" previews, the chip
  // sort, cardTotals, the Blind Declaration halving — assumes an integer.
  const pay = (key, standard) => (tvs ? Math.round(tileValue * mult[key]) : standard);

  for (let rank = 1; rank <= UPPER_KEYS.length; rank++) {
    out[UPPER_KEYS[rank - 1]] = (counts[rank] || 0) * rank;
  }

  const isFullHouse =
    !hasZero && distinct.length === 2 && groupSizes.includes(3) && groupSizes.includes(2);
  const isRackFive = distinct.length === 1 && counts[distinct[0]] === ranks.length;

  out.threeKind = largestGroup >= 3 ? pay('threeKind', sum) : 0;
  out.fourKind = largestGroup >= 4 ? pay('fourKind', sum) : 0;
  out.fullHouse = isFullHouse ? pay('fullHouse', lower.fullHouse) : 0;
  out.smallStraight = longestRun >= 4 ? pay('smallStraight', lower.smallStraight) : 0;
  out.largeStraight =
    distinct.length === 5 && longestRun >= 5 ? pay('largeStraight', lower.largeStraight) : 0;
  out.chance = pay('chance', sum);
  out.rackFive = isRackFive ? pay('rackFive', ruleset.rackFiveMultiplier * distinct[0]) : 0;

  return out;
}

/**
 * Plain-language result line — rulebook §11 requires one after scoring:
 * "Full House: three rank-4 words and two rank-2 words. +25"
 *
 * @param options  { tileValueScoring, tileValue } — when the variant is on, the
 *                 lines that name the rank sum have to name tile value instead.
 *                 Defaults keep the original three-argument call working.
 */
export function describeScore(key, ranks, points, options = {}) {
  const tvs = !!options.tileValueScoring;
  const tv = options.tileValue || 0;
  const counts = {};
  for (const r of ranks) if (r > 0) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.keys(counts)
    .map(Number)
    .sort((a, b) => counts[b] - counts[a] || b - a);
  const words = (n) => ['no', 'one', 'two', 'three', 'four', 'five'][n] || String(n);
  const phrase = (rank) =>
    `${words(counts[rank])} rank-${rank} word${counts[rank] === 1 ? '' : 's'}`;
  const empties = ranks.filter((r) => r === 0).length;
  const tail = empties
    ? ` ${empties} empty slot${empties === 1 ? '' : 's'} scored rank 0.`
    : '';

  switch (key) {
    case 'fullHouse':
      return `Full House: ${groups.map(phrase).join(' and ')}. +${points}`;
    case 'smallStraight':
    case 'largeStraight':
      return `${key === 'smallStraight' ? 'Small' : 'Large'} Straight: ranks ${ranks
        .filter((r) => r > 0)
        .sort((a, b) => a - b)
        .join('-')}. +${points}`;
    case 'threeKind':
    case 'fourKind':
      return `${key === 'threeKind' ? 'Three' : 'Four'} of a Kind: ${phrase(groups[0])}, scoring ${
        tvs ? `on tile value ${tv}` : 'the sum of all five ranks'
      }. +${points}${tail}`;
    case 'rackFive':
      return points
        ? `Rack Five: all five words at rank ${groups[0]}${
            tvs ? `, scoring on tile value ${tv}` : ''
          }. +${points}`
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
 * Card totals. Upper bonus threshold is per-difficulty (rulebook §6: expect to
 * need three different thresholds once there is real data).
 */
export function cardTotals(ruleset, card, difficulty, wordBank = 0, jumboPoints = 0) {
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
    total: scorecard + wordBank + jumboPoints
  };
}
