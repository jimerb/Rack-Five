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
 * Deal one turn.
 *
 * Same (seed, turnNo, budget) always yields the same opening rack AND the same
 * ordered replacement queue — players who discard different tiles, or different
 * quantities, still receive the same first replacement, second replacement and
 * so on. Choice is preserved; luck is reproducible.
 */
export function drawTurn(ruleset, seed, turnNo, budget) {
  const rnd = turnRandom(seed, turnNo);
  const bag = shuffle(buildBag(ruleset), rnd);
  const queueLength = Math.min(
    Math.max(
      ruleset.refresh.replacementQueueLength,
      ruleset.refresh.count * ruleset.refresh.maximumTiles
    ),
    bag.length - budget
  );
  return {
    rack: bag.slice(0, budget).map((s, i) => makeTile(ruleset, s, turnNo + '-r' + i)),
    queue: bag
      .slice(budget, budget + queueLength)
      .map((s, i) => makeTile(ruleset, s, turnNo + '-q' + i))
  };
}

/** Sum of tile values. Blanks are 0 — rulebook §10. */
export function sumTileValue(tiles) {
  return tiles.reduce((a, t) => a + (t.blank ? 0 : t.value), 0);
}
