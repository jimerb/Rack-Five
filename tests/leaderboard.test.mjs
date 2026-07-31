import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLeaderboardRecap,
  hasLeaderboardRecap,
  mergeBoards,
  MAX_LEADERBOARD_ENTRIES
} from '../app/src/state/leaderboardData.js';
import { fetchRemote, pushRemote, remoteAvailable, resetRemoteStatus } from '../app/src/state/leaderboardSync.js';

function run(overrides = {}) {
  return {
    runId: 'r-test',
    seed: 'RF-TEST',
    difficulty: 'medium',
    timing: 'relaxed',
    rulesetVersion: 'rules-v1',
    rngVersion: 'rng-v1',
    dictionaryId: 'enable1',
    dictionaryVersion: 'enable1-v1',
    isCustom: false,
    interrupted: false,
    startedAt: 1000,
    completedAt: 61000,
    history: [
      {
        turnNo: 1,
        words: ['CAT'],
        lengths: [3],
        tileValues: [3],
        redTileSlots: [false],
        ranks: [1],
        category: 'ones',
        categoryPoints: 1,
        bankedWord: 'CAT',
        bankedWordValue: 2
      }
    ],
    ruleset: { dictionaryMissPenalty: { maximumFreeMisses: 5 } },
    ...overrides
  };
}

test('builds a stable recap without copying the live ruleset', () => {
  const recap = buildLeaderboardRecap(
    run(),
    { scorecard: 42, upper: 20, lower: 22, bonus: 35, threshold: 63, missPenalty: 4, total: 80 },
    {
      card: { ones: 1 },
      wordBank: 8,
      jumboPoints: 12,
      jumboWord: 'JUMBO',
      hintsUsed: 1,
      hintPointsSpent: 3,
      dictionaryMisses: 7
    }
  );

  assert.equal(recap.version, 1);
  assert.equal(recap.durationSeconds, 60);
  assert.equal(recap.totals.missPenaltyFree, 5);
  assert.equal(recap.totals.total, 80);
  assert.equal(recap.turns[0].words[0], 'CAT');
  assert.equal(recap.ruleset, undefined);
  assert.equal(hasLeaderboardRecap({ recap }), true);
});

test('merge prefers a richer recap for the same run', () => {
  const old = { id: 'r1', date: 20, name: 'Old', score: 10 };
  const rich = { id: 'r1', date: 10, name: 'New', score: 10, recap: { version: 1, card: {}, turns: [] } };
  const result = mergeBoards([old], [rich]);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'New');
  assert.equal(hasLeaderboardRecap(result[0]), true);
});

test('merge caps the local cache at the newest 500 entries', () => {
  const entries = Array.from({ length: MAX_LEADERBOARD_ENTRIES + 7 }, (_, i) => ({
    id: 'r' + i,
    date: i,
    score: i,
    name: 'Player'
  }));
  const result = mergeBoards(entries, []);
  assert.equal(result.length, MAX_LEADERBOARD_ENTRIES);
  assert.equal(result[0].id, 'r506');
  assert.equal(result.at(-1).id, 'r7');
});

test('client sync uses JSON batches and falls back after a static-host 404', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  resetRemoteStatus();
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (options && options.method === 'POST') {
        return new Response(JSON.stringify({ acceptedIds: ['r1'] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
      return new Response(JSON.stringify([entryForSync()]), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    };

    const remote = await fetchRemote();
    assert.equal(remote[0].id, 'r1');
    const pushed = await pushRemote([entryForSync()]);
    assert.deepEqual(pushed.acceptedIds, ['r1']);
    assert.deepEqual(JSON.parse(calls[1].options.body), { entries: [entryForSync()] });

    globalThis.fetch = async () => new Response('Not found', { status: 404 });
    await assert.rejects(fetchRemote);
    assert.equal(remoteAvailable(), false);
  } finally {
    globalThis.fetch = originalFetch;
    resetRemoteStatus();
  }
});

function entryForSync() {
  return { id: 'r1', name: 'Player', date: 1, score: 1, difficulty: 'easy', timing: 'relaxed' };
}
