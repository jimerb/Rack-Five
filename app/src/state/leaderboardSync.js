// Shared leaderboard persistence. localStorage remains the optimistic cache and
// fallback for GitHub Pages or any other static host; Codex Sites serves the
// authoritative copy from /api/leaderboard.

import { mergeBoards } from './leaderboardData.js';

// Relative, not root-absolute: hosting often puts the app under a path rather
// than at a domain root, and './api/…' resolves against wherever index.html
// actually lives.
const ENDPOINT = './api/leaderboard';

// A static host has no endpoint at all. That is a supported way to run — the
// board is simply per-device — so a definitive 404/405/501 is remembered and no
// further requests are made during this session.
let unavailable = false;

export function remoteAvailable() {
  return !unavailable;
}

export function resetRemoteStatus() {
  unavailable = false;
}

export async function fetchRemote() {
  if (unavailable) throw new Error('leaderboard endpoint unavailable');
  let res;
  try {
    res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
  } catch (err) {
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
  return Array.isArray(data) ? mergeBoards(data, []) : [];
}

export function pushRemote(entries) {
  const batch = mergeBoards(entries, []);
  if (unavailable || !batch.length) return Promise.resolve({ acceptedIds: [] });
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries: batch })
  }).then(async (res) => {
    if (!res.ok) {
      if (res.status === 404 || res.status === 405 || res.status === 501) unavailable = true;
      throw new Error('leaderboard push failed: ' + res.status);
    }
    const data = await res.json().catch(() => ({}));
    return { acceptedIds: Array.isArray(data.acceptedIds) ? data.acceptedIds : batch.map((x) => x.id) };
  });
}

export { mergeBoards } from './leaderboardData.js';
