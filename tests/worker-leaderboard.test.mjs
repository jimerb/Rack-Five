import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../dist/server/index.js';

class MockD1 {
  constructor() {
    this.rows = new Map();
  }

  prepare(sql) {
    const db = this;
    return {
      sql,
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async all() {
        return {
          results: [...db.rows.values()]
            .sort((a, b) => b.date - a.date)
            .slice(0, this.values[0])
            .map((row) => ({ payload_json: row.payload_json }))
        };
      }
    };
  }

  async batch(statements) {
    for (const statement of statements) {
      if (statement.sql.includes('INSERT INTO leaderboard_entries')) {
        const [id, score, hints, durationMinutes, date, difficulty, timing, isCustom, payload_json] = statement.values;
        this.rows.set(id, { id, score, hints, durationMinutes, date, difficulty, timing, isCustom, payload_json });
      } else if (statement.sql.includes('DELETE FROM leaderboard_entries')) {
        const keep = [...this.rows.values()].sort((a, b) => b.date - a.date).slice(0, statement.values[0]);
        this.rows = new Map(keep.map((row) => [row.id, row]));
      }
    }
  }
}

function entry(i, overrides = {}) {
  return {
    id: 'r' + i,
    name: 'Player ' + i,
    bestWord: 'CAT',
    bestWordValue: 3,
    jumboWord: '',
    score: i,
    difficulty: 'medium',
    timing: 'relaxed',
    date: 1000 + i,
    seed: 'RF-' + i,
    rulesetVersion: 'rules-v1',
    dictionaryId: 'enable1',
    dictionaryVersion: 'enable1-v1',
    scorecard: i,
    upperBonus: 0,
    wordBank: 0,
    jumbo: 0,
    hints: 0,
    durationMinutes: 1,
    interrupted: false,
    isCustom: false,
    variantTag: null,
    recap: null,
    ...overrides
  };
}

async function post(db, entries) {
  return worker.fetch(
    new Request('https://rack-five.example/api/leaderboard', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entries })
    }),
    { DB: db }
  );
}

test('GET starts empty and POST upserts a shared entry', async () => {
  const db = new MockD1();
  const empty = await worker.fetch(new Request('https://rack-five.example/api/leaderboard'), { DB: db });
  assert.deepEqual(await empty.json(), []);

  const saved = await post(db, [entry(1)]);
  assert.equal(saved.status, 200);
  assert.deepEqual((await saved.json()).acceptedIds, ['r1']);

  const listed = await worker.fetch(new Request('https://rack-five.example/api/leaderboard'), { DB: db });
  assert.equal((await listed.json()).length, 1);

  await post(db, [entry(1, { name: 'Updated' })]);
  const updated = await (await worker.fetch(new Request('https://rack-five.example/api/leaderboard'), { DB: db })).json();
  assert.equal(updated.length, 1);
  assert.equal(updated[0].name, 'Updated');
});

test('concurrent posts retain both entries and invalid methods/payloads are rejected', async () => {
  const db = new MockD1();
  const responses = await Promise.all([post(db, [entry(2)]), post(db, [entry(3)])]);
  assert.deepEqual(responses.map((response) => response.status), [200, 200]);

  const badJson = await worker.fetch(
    new Request('https://rack-five.example/api/leaderboard', { method: 'POST', body: '{' }),
    { DB: db }
  );
  assert.equal(badJson.status, 400);

  const badEntry = await post(db, [entry(4, { difficulty: 'impossible' })]);
  assert.equal(badEntry.status, 400);

  const method = await worker.fetch(new Request('https://rack-five.example/api/leaderboard', { method: 'DELETE' }), { DB: db });
  assert.equal(method.status, 405);
  assert.deepEqual((await (await worker.fetch(new Request('https://rack-five.example/api/leaderboard'), { DB: db })).json()).map((x) => x.id).sort(), ['r2', 'r3']);
});

test('retains only the newest 500 entries', async () => {
  const db = new MockD1();
  for (let start = 0; start < 500; start += 100) {
    const response = await post(db, Array.from({ length: 100 }, (_, offset) => entry(start + offset)));
    assert.equal(response.status, 200);
  }
  assert.equal((await post(db, [entry(500)])).status, 200);

  const listed = await (await worker.fetch(new Request('https://rack-five.example/api/leaderboard'), { DB: db })).json();
  assert.equal(listed.length, 500);
  assert.equal(listed.some((x) => x.id === 'r0'), false);
  assert.equal(listed.some((x) => x.id === 'r500'), true);
});
