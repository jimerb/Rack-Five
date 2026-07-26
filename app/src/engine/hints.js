// Hints.
//
// Rulebook §11: "A hint costs 3 points and reveals one valid word of a chosen
// length from the current loose tiles. The Word Bank cannot go below zero.
// Maximum two hints per game." The hint makes no promise that its word belongs
// in an optimal five-word solution.
//
// PRD §15.4: do NOT enumerate rack subsets. Filter the dictionary by target
// length and test each candidate against the rack multiset. Tens of thousands of
// cheap checks, which is fast; subset enumeration is 2^40 and is not.
//
// And never auto-highlight every findable word. That converts the game into
// picking from a list the computer produced.

/**
 * @returns { word } or { word: null, reason }
 */
export function findHint({ dict, tiles, length, preferHighValue = true }) {
  if (!dict || dict.status !== 'ready') {
    return { word: null, reason: 'The dictionary is not loaded, so no word can be suggested.' };
  }
  const candidates = dict.byLength.get(length);
  if (!candidates || !candidates.length) {
    return { word: null, reason: `No ${length}-letter words in this dictionary.` };
  }

  const pool = {};
  let blanks = 0;
  for (const t of tiles) {
    if (t.blank) blanks++;
    else pool[t.letter] = (pool[t.letter] || 0) + 1;
  }

  let best = null;
  let bestValue = -1;
  for (const word of candidates) {
    const need = {};
    for (const ch of word) need[ch] = (need[ch] || 0) + 1;
    let wild = blanks;
    let ok = true;
    for (const ch of Object.keys(need)) {
      const have = pool[ch] || 0;
      if (have < need[ch]) {
        wild -= need[ch] - have;
        if (wild < 0) {
          ok = false;
          break;
        }
      }
    }
    if (!ok) continue;
    if (!preferHighValue) return { word };
    // Among reachable words prefer a memorable one — but stop early so a hint
    // never costs a visible pause.
    const value = scoreWord(word);
    if (value > bestValue) {
      bestValue = value;
      best = word;
      if (value >= 18) break;
    }
  }

  return best
    ? { word: best }
    : {
        word: null,
        reason: `No ${length}-letter word can be built from your loose tiles right now.`
      };
}

const RARITY = { J: 8, K: 5, Q: 10, X: 8, Z: 10, V: 4, W: 4, Y: 4, F: 4, H: 4, B: 3, C: 3, M: 3, P: 3 };
function scoreWord(word) {
  let v = 0;
  for (const ch of word) v += RARITY[ch] || 1;
  return v;
}
