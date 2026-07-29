// Server-side leaderboard persistence.
//
// localStorage alone is per-browser and vanishes with a profile wipe, so the
// board is mirrored to a JSON file behind /api/leaderboard. The file is capped
// server-side, which is why no database is needed. If the endpoint is missing
// (opened from disk, or a static host), everything still works locally.

const ENDPOINT = '/api/leaderboard';

export async function fetchRemote() {
  const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('leaderboard fetch failed: ' + res.status);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function pushRemote(entries) {
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries)
  }).catch(() => {});
}

/** Union by entry id, newest run kept, sorted newest-first so the cap trims oldest. */
export function mergeBoards(a, b) {
  const byId = new Map();
  for (const entry of a.concat(b)) {
    if (!entry || !entry.id) continue;
    // Entries recorded before the leaderboard asked for a name belong to Terry B.
    byId.set(entry.id, entry.name ? entry : { ...entry, name: 'Terry B' });
  }
  return [...byId.values()].sort((x, y) => y.date - x.date);
}
