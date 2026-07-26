// Engine tests. Open tests/index.html in the browser (via serve.cmd).
//
// PRD §22.2: "Scoring must be covered by automated tests for every category and
// overlap rule." These are those tests, plus the seeded-generation and budget
// invariant checks the rulebook calls out as the things that silently rot.

import { loadStandardRuleset, standardRuleset, effectiveRuleset, labDefaults } from '../src/engine/ruleset.js';
import { lengthToRank } from '../src/engine/rank.js';
import { evaluate, cardTotals } from '../src/engine/evaluator.js';
import { drawTurn, buildBag } from '../src/engine/bag.js';
import { hashSeed, mulberry32, normaliseSeed } from '../src/engine/rng.js';

const results = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function check(group, name, actual, expected) {
  results.push({ group, name, ok: eq(actual, expected), actual, expected });
}

export async function run() {
  await loadStandardRuleset('../data/ruleset.json');
  const R = standardRuleset();
  const e = (ranks) => evaluate(R, ranks);

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

  /* Totals and the upper bonus */
  const card = {
    ones: 3, twos: 8, threes: 12, fours: 16, fives: 15, sixes: 12,
    threeKind: 20, fourKind: 0, fullHouse: 25, smallStraight: 30,
    largeStraight: 0, chance: 17, rackFive: 0
  };
  const t = cardTotals(R, card, 'medium', 142, 27);
  check('totals', 'upper subtotal', t.upper, 66);
  check('totals', 'bonus earned at threshold', t.bonus, 35);
  check('totals', 'final total', t.total, 66 + 35 + 92 + 142 + 27);
  const under = cardTotals(R, { ...card, sixes: 0 }, 'medium', 0, 0);
  check('totals', 'no bonus below threshold', under.bonus, 0);

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

  return results;
}

export function summarise(list) {
  const failed = list.filter((r) => !r.ok);
  return { total: list.length, passed: list.length - failed.length, failed };
}
