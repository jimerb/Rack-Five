// Canonical D1 schema for the shared leaderboard. The generated migration is
// committed beside this source so Sites can apply it during deployment.
export const leaderboardSchemaSql = `
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY,
  score INTEGER NOT NULL,
  hints INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  date INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  timing TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL
);
`;
