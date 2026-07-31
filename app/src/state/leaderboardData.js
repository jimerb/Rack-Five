export const MAX_LEADERBOARD_ENTRIES = 500;
export const LEADERBOARD_RECAP_VERSION = 1;

/**
 * Make the durable, display-only part of a completed run. The ruleset itself is
 * deliberately not copied into the shared board: historical results must not
 * change when the live ruleset changes, and the recap only needs the values it
 * displays.
 */
export function buildLeaderboardRecap(run, totals, player) {
  const missRules = run.ruleset && run.ruleset.dictionaryMissPenalty;
  return {
    version: LEADERBOARD_RECAP_VERSION,
    runId: run.runId,
    seed: run.seed,
    difficulty: run.difficulty,
    timing: run.timing,
    rulesetVersion: run.rulesetVersion,
    rngVersion: run.rngVersion,
    dictionaryId: run.dictionaryId,
    dictionaryVersion: run.dictionaryVersion,
    isCustom: !!run.isCustom,
    interrupted: !!run.interrupted,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationSeconds: Math.max(0, Math.round(((run.completedAt || 0) - run.startedAt) / 1000)),
    card: { ...player.card },
    totals: {
      scorecard: totals.scorecard,
      upper: totals.upper,
      lower: totals.lower,
      bonus: totals.bonus,
      threshold: totals.threshold,
      wordBank: player.wordBank,
      jumbo: player.jumboPoints,
      hints: player.hintsUsed,
      hintPointsSpent: player.hintPointsSpent,
      dictionaryMisses: player.dictionaryMisses || 0,
      missPenaltyFree: missRules ? missRules.maximumFreeMisses : 0,
      missPenalty: totals.missPenalty || 0,
      total: totals.total
    },
    jumboWord: player.jumboWord || '',
    turns: (run.history || []).map((turn) => ({
      ...turn,
      words: [...(turn.words || [])],
      lengths: [...(turn.lengths || [])],
      tileValues: [...(turn.tileValues || [])],
      redTileSlots: [...(turn.redTileSlots || [])],
      ranks: [...(turn.ranks || [])]
    }))
  };
}

export function hasLeaderboardRecap(entry) {
  return !!(
    entry &&
    entry.recap &&
    entry.recap.version === LEADERBOARD_RECAP_VERSION &&
    entry.recap.card &&
    Array.isArray(entry.recap.turns)
  );
}

function chooseEntry(existing, incoming) {
  if (!existing) return incoming;
  const existingHasRecap = hasLeaderboardRecap(existing);
  const incomingHasRecap = hasLeaderboardRecap(incoming);
  if (existingHasRecap !== incomingHasRecap) return incomingHasRecap ? incoming : existing;
  return Number(incoming.date || 0) >= Number(existing.date || 0) ? incoming : existing;
}

/** Union entries by run ID, preferring a richer recap, then the newer record. */
export function mergeBoards(a = [], b = []) {
  const byId = new Map();
  for (const entry of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    if (!entry || !entry.id) continue;
    const named = entry.name ? entry : { ...entry, name: 'Terry B' };
    byId.set(named.id, chooseEntry(byId.get(named.id), named));
  }
  return [...byId.values()]
    .sort((x, y) => Number(y.date || 0) - Number(x.date || 0))
    .slice(0, MAX_LEADERBOARD_ENTRIES);
}
