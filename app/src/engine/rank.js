// Word length becomes rank. This is the whole conceit of the game and the one
// conversion the player must never have to do in their head.
//
//   3 → 1   4 → 2   5 → 3   6 → 4   7 → 5   8+ → 6
//
// Read from ruleset.rankBands, which is a structural safeguard and is never
// exposed in the Gameplay Lab.

export function lengthToRank(ruleset, length) {
  if (length < ruleset.minimumWordLength) return 0;
  for (const band of ruleset.rankBands) {
    const min = band.minimumLength;
    const max = band.maximumLength;
    if (length >= min && (max === null || length <= max)) return band.rank;
  }
  return 0;
}

/** The shortest word length that produces a given rank — used by the hint picker. */
export function lengthForRank(ruleset, rank) {
  const band = ruleset.rankBands.find((b) => b.rank === rank);
  return band ? band.minimumLength : 0;
}

/** The 3→1 … 8+→6 chips shown under the rack and in How to Play. */
export function rankTable(ruleset) {
  return ruleset.rankBands.map((b) => ({
    length: b.maximumLength === null ? b.minimumLength + '+' : String(b.minimumLength),
    rank: b.rank
  }));
}
