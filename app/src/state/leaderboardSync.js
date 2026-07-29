// Server-side leaderboard persistence.
//
// localStorage alone is per-browser and vanishes with a profile wipe, so the
// board is mirrored to a JSON file behind /api/leaderboard. The file is capped
// server-side, which is why no database is needed. If the endpoint is missing
// (opened from disk, or a static host), everything still works locally.

// Relative, not root-absolute: hosting often puts the app under a path rather
// than at a domain root, and './api/…' resolves against wherever index.html
// actually lives.
const ENDPOINT = './api/leaderboard';

// A static host has no endpoint at all. That is a supported way to run — the
// board is simply per-device — so the first refusal is remembered and no further
// requests are made, rather than every leaderboard visit retrying a 404.
let unavailable = false;

export function remoteAvailable() {
  return !unavailable;
}

export async function fetchRemote() {
  if (unavailable) throw new Error('leaderboard endpoint unavailable');
  let res;
  try {
    res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
  } catch (err) {
    unavailable = true;
    throw err;
  }
  if (!res.ok) {
    if (res.status === 404 || res.status === 405 || res.status === 501) unavailable = true;
    throw new Error('leaderboard fetch failed: ' + res.status);
  }
  // A host with a single-page fallback answers an unknown path with index.html
  // and a 200, so the status alone does not prove there is an endpoint here.
  const type = res.headers.get('content-type') || '';
  if (!type.includes('json')) {
    unavailable = true;
    throw new Error('leaderboard endpoint returned ' + (type || 'no content type'));
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function pushRemote(entries) {
  if (unavailable) return Promise.resolve();
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
