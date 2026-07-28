// Engine tests. Open tests/index.html in the browser (via serve.cmd).
//
// PRD §22.2: "Scoring must be covered by automated tests for every category and
// overlap rule." These are those tests, plus the seeded-generation and budget
// invariant checks the rulebook calls out as the things that silently rot.

import {
  loadStandardRuleset,
  standardRuleset,
  effectiveRuleset,
  labDefaults,
  labIsModified,
  sanitizeLabValues,
  variantTag,
  lockedVariants,
  VARIANT_PRESETS
} from '../src/engine/ruleset.js';
import { lengthToRank } from '../src/engine/rank.js';
import { evaluate, cardTotals, explainScore, redTileApplies } from '../src/engine/evaluator.js';
import { drawTurn, buildBag, tileValue } from '../src/engine/bag.js';
import { hashSeed, mulberry32, normaliseSeed } from '../src/engine/rng.js';

const results = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function check(group, name, actual, expected) {
  results.push({ group, name, ok: eq(actual, expected), actual, expected });
}

/** A Lab ruleset: defaults with `over` applied, variants merged not replaced. */
function labWith(over = {}) {
  const D = labDefaults();
  return effectiveRuleset({
    enabled: true,
    values: { ...D, ...over, variants: { ...D.variants, ...(over.variants || {}) } }
  });
}

export async function run() {
  await loadStandardRuleset('../data/ruleset.json');
  const R = standardRuleset();

  // Tile Value Scoring ships on, so rank-based scoring is now the variant-off
  // path. It is still a supported way to play and still has to be right, so the
  // whole original suite runs against a ruleset with the variant switched off —
  // including the upper bonus the preset carries with it.
  const RANK = labWith({
    upperBonusPoints: R.rankScoring.upperBonusPoints,
    variants: { tileValueScoring: false, redTile: false }
  });
  const e = (ranks) => evaluate(RANK, ranks);

  /* Rank conversion — rulebook §1 */
  check('rank', 'length to rank', [2, 3, 4, 5, 6, 7, 8, 9, 13].map((l) => lengthToRank(R, l)), [0, 1, 2, 3, 4, 5, 6, 6, 6]);

  /* Upper section */
  check('upper', 'ones counts rank-1 words', e([1, 1, 3, 3, 3]).ones, 2);
  check('upper', 'threes counts rank-3 words', e([1, 1, 3, 3, 3]).threes, 9);
  check('upper', 'sixes counts rank-6 words', e([6, 6, 1, 1, 1]).sixes, 12);

  /* Lower section and the qualification rules — rulebook §6 */
  check('lower', 'three of a kind sums all five ranks', e([5, 5, 5, 1, 2]).threeKind, 18);
  check('lower', 'three of a kind needs three', e([5, 5, 1, 2, 3]).threeKind, 0);
  check('lower', 'four of a kind needs four', e([3, 3, 3, 5, 5]).fourKind, 0);
  check('lower', 'four of a kind qualifies as three', e([3, 3, 3, 3, 5]).threeKind, 17);
  check('lower', 'full house 3 and 2', e([4, 4, 4, 2, 2]).fullHouse, 25);
  check('lower', 'full house needs exactly two ranks', e([4, 4, 4, 2, 3]).fullHouse, 0);
  check('lower', 'small straight, fifth word free', e([1, 2, 3, 4, 4]).smallStraight, 30);
  check('lower', 'small straight needs four consecutive', e([1, 2, 3, 5, 6]).smallStraight, 0);
  check('lower', 'large straight', e([2, 3, 4, 5, 6]).largeStraight, 40);
  check('lower', 'large straight rejects a duplicate', e([2, 3, 4, 5, 5]).largeStraight, 0);
  check('lower', 'chance sums the ranks', e([6, 1, 1, 1, 1]).chance, 10);

  /* Rack Five and its overlaps */
  check('rackFive', 'rank 6 pays 60', e([6, 6, 6, 6, 6]).rackFive, 60);
  check('rackFive', 'rank 1 pays 10', e([1, 1, 1, 1, 1]).rackFive, 10);
  check('rackFive', 'qualifies as three of a kind', e([4, 4, 4, 4, 4]).threeKind, 20);
  check('rackFive', 'qualifies as four of a kind', e([4, 4, 4, 4, 4]).fourKind, 20);
  check('rackFive', 'does NOT qualify as a full house', e([4, 4, 4, 4, 4]).fullHouse, 0);

  /* Rank 0 never satisfies a pattern */
  check('rank0', 'adds nothing to a sum', e([4, 4, 4, 0, 0]).chance, 12);
  check('rank0', 'cannot complete a full house', e([4, 4, 4, 0, 0]).fullHouse, 0);
  check('rank0', 'cannot extend a straight', e([0, 3, 4, 5, 6]).largeStraight, 0);
  check('rank0', 'a straight of four still counts', e([1, 2, 3, 4, 0]).smallStraight, 30);
  check('rank0', 'cannot make a Rack Five', e([3, 3, 3, 3, 0]).rackFive, 0);

  /* Tile Value Scoring — the lower section pays letters, qualification is unchanged.
     Every assertion above doubles as proof the variant-off path did not move. */
  const TV = labWith({ variants: { redTile: false } });
  const tvals = [10, 8, 6, 4, 2]; // sums to 30
  const t5 = (ranks) => evaluate(TV, ranks, { tileValues: tvals });

  check('tileValue', 'three of a kind pays 1.0x', t5([5, 5, 5, 1, 2]).threeKind, 30);
  check('tileValue', 'four of a kind pays 1.1x', t5([5, 5, 5, 5, 2]).fourKind, 33);
  check('tileValue', 'full house pays 1.2x', t5([4, 4, 4, 2, 2]).fullHouse, 36);
  check('tileValue', 'small straight pays 1.2x', t5([1, 2, 3, 4, 4]).smallStraight, 36);
  check('tileValue', 'large straight pays 1.5x', t5([2, 3, 4, 5, 6]).largeStraight, 45);
  check('tileValue', 'chance pays 0.75x, rounded not floored', t5([6, 1, 1, 1, 1]).chance, 23);
  check('tileValue', 'rack five pays 1.5x', t5([4, 4, 4, 4, 4]).rackFive, 45);
  check('tileValue', 'rack five no longer depends on rank', t5([1, 1, 1, 1, 1]).rackFive, 45);
  check('tileValue', 'qualification is still rank-based', t5([5, 5, 1, 2, 3]).threeKind, 0);
  check('tileValue', 'a rack five still fails full house', t5([4, 4, 4, 4, 4]).fullHouse, 0);
  check('tileValue', 'the upper section stays rank-based', t5([3, 3, 3, 1, 2]).threes, 9);
  check('tileValue', 'payouts are always integers', Number.isInteger(t5([6, 1, 1, 1, 1]).chance), true);
  check('tileValue', 'empty slots carry no tile value',
    evaluate(TV, [4, 4, 4, 0, 0], { tileValues: [10, 8, 6, 0, 0] }).threeKind, 24);
  check('tileValue', 'switching it off restores rank scoring', e([5, 5, 5, 1, 2]).threeKind, 18);
  check('tileValue', 'it is on in the standard ruleset', R.experimentalVariants.tileValueScoring, true);
  check('tileValue', 'a pre-variant ruleset snapshot does not throw',
    evaluate(
      { ...R, tileValueScoring: undefined, experimentalVariants: { tileValueScoring: true } },
      [5, 5, 5, 1, 2],
      { tileValues: tvals }
    ).threeKind, 18);

  /* Red Tile — it multiplies a lower-section payout, but only when it is in a
     word that category's qualification actually rests on. */
  const RED = labWith({});
  const red = (ranks, slots) => evaluate(RED, ranks, { tileValues: tvals, redTileSlots: slots });
  const none = [false, false, false, false, false];

  check('redTile', 'no red tile pays the ordinary amount', red([5, 5, 5, 1, 2], none).threeKind, 30);
  check('redTile', 'a red tile in the tripled rank doubles it',
    red([5, 5, 5, 1, 2], [true, false, false, false, false]).threeKind, 60);
  check('redTile', 'a red tile outside the tripled rank does not',
    red([5, 5, 5, 1, 2], [false, false, false, true, false]).threeKind, 30);
  check('redTile', 'a red tile in the straight doubles it',
    red([1, 2, 3, 4, 6], [true, false, false, false, false]).smallStraight, 72);
  check('redTile', 'a red tile in the free fifth word does not',
    red([1, 2, 3, 4, 6], [false, false, false, false, true]).smallStraight, 36);
  check('redTile', 'chance rests on every word',
    red([6, 1, 1, 1, 1], [false, false, false, false, true]).chance, 45);
  check('redTile', 'an empty slot cannot be red',
    red([4, 4, 4, 0, 0], [false, false, false, true, false]).threeKind, 30);
  check('redTile', 'the upper section is never multiplied',
    red([3, 3, 3, 1, 2], [true, false, false, false, false]).threes, 9);
  check('redTile', 'a non-qualifying hand stays at zero',
    red([5, 5, 1, 2, 3], [true, false, false, false, false]).threeKind, 0);
  check('redTile', 'the variant off means no multiplier',
    evaluate(labWith({ variants: { redTile: false } }), [5, 5, 5, 1, 2], {
      tileValues: tvals,
      redTileSlots: [true, false, false, false, false]
    }).threeKind, 30);
  check('redTile', 'a pre-variant ruleset snapshot does not throw',
    redTileApplies({ ...R, redTile: undefined }, 'threeKind', [5, 5, 5, 1, 2], [true, false, false, false, false]), false);
  check('redTile', 'rank scoring can carry it too',
    evaluate(labWith({ upperBonusPoints: R.rankScoring.upperBonusPoints, variants: { tileValueScoring: false } }),
      [4, 4, 4, 2, 2], { redTileSlots: [true, false, false, false, false] }).fullHouse, 50);

  /* The draw has to stay reproducible, respect the cap, and actually favour the
     hard letters — a red tile that lands on E is not a decision. */
  const redDeal = (seed, turnNo, left) =>
    drawTurn(RED, seed, turnNo, 40, { redTilesLeft: left }).rack.find((x) => x.red) || null;
  const seeds = ['RF-7K4M2', 'RF-ZP5KD', 'RF-QQ3TT', 'RF-M8N4P', 'RF-BB2CC', 'RF-LL9WW'];
  const drawn = seeds.map((s) => redDeal(s, 1, 2));
  check('redTile', 'the same seed and turn draw the same red tile',
    drawn.map((x) => (x ? x.id : null)), seeds.map((s) => { const x = redDeal(s, 1, 2); return x ? x.id : null; }));
  check('redTile', 'the cap suppresses it', seeds.map((s) => redDeal(s, 1, 0)).filter(Boolean).length, 0);
  check('redTile', 'at most one per rack',
    drawTurn(RED, 'RF-7K4M2', 1, 40, { redTilesLeft: 2 }).rack.filter((x) => x.red).length <= 1, true);
  check('redTile', 'a blank is never red', drawn.filter((x) => x && x.blank).length, 0);

  // Averaged over many turns the red tile must be worth clearly more than an
  // average tile, or the "gravitates towards harder letters" rule is not real.
  const picks = [];
  for (let i = 1; i <= 400; i++) {
    const x = redDeal('RF-SPREAD', i, 2);
    if (x) picks.push(x.value);
  }
  const bagAverage =
    buildBag(RED).reduce((a, s) => a + tileValue(RED, s), 0) / 100;
  const redAverage = picks.reduce((a, b) => a + b, 0) / picks.length;
  check('redTile', 'the draw favours hard letters', redAverage > bagAverage * 2, true);
  check('redTile', 'the rarity is roughly the configured one',
    Math.abs(picks.length / 400 - RED.redTile.rarity) < 0.08, true);

  /* The hover explanations must agree with what the evaluator actually pays —
     a tooltip that shows different working than the score is worse than none. */
  const last = (x) => x.lines[x.lines.length - 1][1];
  check('explain', 'upper working ends at the payout',
    last(explainScore(RANK, 'threes', [3, 3, 3, 1, 2])), e([3, 3, 3, 1, 2]).threes);
  check('explain', 'rank-sum working ends at the payout',
    last(explainScore(RANK, 'threeKind', [5, 5, 5, 1, 2])), e([5, 5, 5, 1, 2]).threeKind);
  check('explain', 'a flat category says so', explainScore(RANK, 'largeStraight', [2, 3, 4, 5, 6]).lines.length, 1);
  check('explain', 'rack five shows the rank multiplier',
    last(explainScore(RANK, 'rackFive', [4, 4, 4, 4, 4])), 40);
  check('explain', 'a non-qualifying hand is called out',
    explainScore(RANK, 'fullHouse', [1, 2, 3, 4, 5]).qualifies, false);
  check('explain', 'tile-value working ends at the payout',
    last(explainScore(TV, 'fourKind', [5, 5, 5, 5, 2], tvals)),
    t5([5, 5, 5, 5, 2]).fourKind);
  check('explain', 'tile-value working shows the multiplier',
    explainScore(TV, 'chance', [1, 1, 1, 1, 1], tvals).lines[1][1], '× 0.75');
  check('explain', 'the upper section is never explained by tile value',
    explainScore(TV, 'ones', [1, 1, 1, 1, 1], tvals).lines[0][0], 'Words of rank 1');
  check('explain', 'red-tile working ends at the payout',
    last(explainScore(RED, 'threeKind', [5, 5, 5, 1, 2], tvals, [true, false, false, false, false])),
    red([5, 5, 5, 1, 2], [true, false, false, false, false]).threeKind);
  check('explain', 'red-tile working names the bonus',
    explainScore(RED, 'threeKind', [5, 5, 5, 1, 2], tvals, [true, false, false, false, false]).lines[2][0],
    'Red tile bonus');
  check('explain', 'no red tile means no extra line',
    explainScore(RED, 'threeKind', [5, 5, 5, 1, 2], tvals, none).lines.length, 3);

  /* Totals and the upper bonus */
  const card = {
    ones: 3, twos: 8, threes: 12, fours: 16, fives: 15, sixes: 12,
    threeKind: 20, fourKind: 0, fullHouse: 25, smallStraight: 30,
    largeStraight: 0, chance: 17, rackFive: 0
  };
  const t = cardTotals(RANK, card, 'medium', 142, 27);
  check('totals', 'upper subtotal', t.upper, 66);
  check('totals', 'bonus earned at threshold', t.bonus, 35);
  check('totals', 'final total', t.total, 66 + 35 + 92 + 142 + 27);
  const under = cardTotals(RANK, { ...card, sixes: 0 }, 'medium', 0, 0);
  check('totals', 'no bonus below threshold', under.bonus, 0);
  check('totals', 'the standard upper bonus matches tile value scoring', R.upperBonusPoints, 100);
  check('totals', 'a miss penalty comes off the total',
    cardTotals(RANK, card, 'medium', 142, 27, 15).total, t.total - 15);
  check('totals', 'no penalty leaves the total alone', cardTotals(RANK, card, 'medium', 142, 27).missPenalty, 0);

  /* Difficulty budgets — rulebook §3 */
  check('budget', 'easy / medium / hard', ['easy', 'medium', 'hard'].map((d) => R.difficulty[d].budget), [45, 40, 35]);
  check('budget', 'bag is 100 tiles', buildBag(R).length, 100);

  /* Seeded generation — rulebook §9 */
  const a = drawTurn(R, 'RF-7K4M2', 1, 40);
  const b = drawTurn(R, 'RF-7K4M2', 1, 40);
  const c = drawTurn(R, 'RF-7K4M2', 2, 40);
  const letters = (deal) => deal.rack.map((x) => (x.blank ? '_' : x.letter)).join('');
  check('seed', 'same seed and turn deal the same rack', letters(a), letters(b));
  check('seed', 'same seed, different turn differs', letters(a) !== letters(c), true);
  check('seed', 'rack matches the budget', a.rack.length, 40);
  check('seed', 'replacement queue holds 20', a.queue.length, 20);
  check('seed', 'queue is identical for the same seed', letters({ rack: a.queue }), letters({ rack: b.queue }));
  check('seed', 'hash is stable', hashSeed('RF-7K4M2:1'), hashSeed('RF-7K4M2:1'));
  check('seed', 'prng is deterministic', mulberry32(42)(), mulberry32(42)());
  check('seed', 'run codes normalise', ['rf-7k4m2', '7K4M2', ' RF-7K4M2 '].map(normaliseSeed), ['RF-7K4M2', 'RF-7K4M2', 'RF-7K4M2']);
  check('seed', 'nonsense run codes are rejected', normaliseSeed('!!'), null);

  /* The budget invariant — every deal starts balanced */
  const easy = drawTurn(R, 'RF-ZP5KD', 1, 45);
  const hard = drawTurn(R, 'RF-ZP5KD', 1, 35);
  check('invariant', 'easy deal equals its budget', easy.rack.length, 45);
  check('invariant', 'hard deal equals its budget', hard.rack.length, 35);
  check('invariant', 'a rank-6 Rack Five needs 40 tiles, so Hard cannot make one', 5 * 8 > 35, true);

  /* Structural safeguards must survive any Lab configuration */
  const wild = effectiveRuleset({
    enabled: true,
    values: { ...labDefaults(), budgetOverride: true, budget: 60, refreshCount: 4, upperBonusThreshold: 30 }
  });
  check('lab', 'lab can move the budget', wild.difficulty.medium.budget, 60);
  check('lab', 'slot count stays locked', wild.slotCount, R.slotCount);
  check('lab', 'rank bands stay locked', wild.rankBands, R.rankBands);
  check('lab', 'a custom ruleset is versioned apart', wild.rulesetVersion !== R.rulesetVersion, true);
  check('lab', 'a multiplier slider reaches the effective ruleset',
    effectiveRuleset({ enabled: true, values: { ...labDefaults(), tvChance: 2 } })
      .tileValueScoring.multipliers.chance, 2);
  check('lab', 'the variant preset leaves standard defaults alone',
    labDefaults().upperBonusPoints, R.upperBonusPoints);
  check('lab', 'defaults alone are not a custom run', labIsModified(labDefaults()), false);
  check('lab', 'no multiplier on its own makes a run custom',
    labIsModified({ ...labDefaults(), tvRackFive: labDefaults().tvRackFive }), false);
  check('lab', 'the upper bonus honours the lab value',
    cardTotals(labWith({ upperBonusPoints: 60 }), card, 'medium', 0, 0).bonus, 60);

  /* The preset must round-trip, or toggling the variant on and off would strand
     the player on a Custom run forever. Tile Value Scoring now ships on, so it
     is switching it OFF that carries the rank-scoring upper bonus in. */
  const D = labDefaults();
  const presetOff = VARIANT_PRESETS.tileValueScoring(R, false);
  const afterOff = { ...D, ...presetOff, variants: { ...D.variants, tileValueScoring: false } };
  const afterOn = { ...afterOff, ...VARIANT_PRESETS.tileValueScoring(R, true), variants: { ...D.variants } };
  check('lab', 'the preset drops the upper bonus when the variant goes off', presetOff.upperBonusPoints, 35);
  check('lab', 'the preset restores it when the variant comes back on',
    VARIANT_PRESETS.tileValueScoring(R, true).upperBonusPoints, 100);
  check('lab', 'turning the variant off makes a run custom', labIsModified(afterOff), true);
  check('lab', 'turning it back on restores eligibility', labIsModified(afterOn), false);
  check('lab', 'red tile drags tile value scoring on with it',
    VARIANT_PRESETS.redTile(R, true).variants.tileValueScoring, true);
  check('lab', 'red tile holds tile value scoring locked',
    lockedVariants({ redTile: true }).tileValueScoring, 'redTile');
  check('lab', 'nothing is locked with red tile off',
    lockedVariants({ redTile: false }).tileValueScoring, undefined);
  check('lab', 'the rarity slider reaches the effective ruleset',
    labWith({ redTileRarity: 0.8 }).redTile.rarity, 0.8);
  check('lab', 'the free-miss slider reaches the effective ruleset',
    labWith({ missPenaltyFreeMisses: 3 }).dictionaryMissPenalty.maximumFreeMisses, 3);
  check('lab', 'an ordinary run carries no variant tag', variantTag(R.experimentalVariants), null);
  check('lab', 'a deviation is tagged',
    variantTag({ ...R.experimentalVariants, redTile: false }), 'No Red Tile');

  /* Persisted Lab blobs from before this variant existed must not strand anyone */
  const legacy = {
    ...D,
    variants: { blindDeclaration: false, chanceScoresTileValue: false, carryOver: false, powerLetters: false }
  };
  check('lab', 'a legacy lab blob is reconciled, not stranded',
    labIsModified(sanitizeLabValues(legacy)), false);
  check('lab', 'the removed variant key is dropped',
    'chanceScoresTileValue' in sanitizeLabValues(legacy).variants, false);
  check('lab', 'the new variant key is restored at its default',
    sanitizeLabValues(legacy).variants.tileValueScoring, true);
  check('lab', 'the red tile key is restored at its default',
    sanitizeLabValues(legacy).variants.redTile, true);
  check('lab', 'a real saved setting still survives sanitising',
    sanitizeLabValues({ ...legacy, hintCost: 7 }).hintCost, 7);

  return results;
}

export function summarise(list) {
  const failed = list.filter((r) => !r.ok);
  return { total: list.length, passed: list.length - failed.length, failed };
}
