export const MAX_ENTRIES = 500;
const MAX_BATCH = 100;
const MAX_PAYLOAD_BYTES = 512 * 1024;
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const TIMINGS = new Set(['relaxed', 'standard', 'blitz']);

const UPSERT_SQL = `
  INSERT INTO leaderboard_entries
    (id, score, hints, duration_minutes, date, difficulty, timing, is_custom, payload_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    score = excluded.score,
    hints = excluded.hints,
    duration_minutes = excluded.duration_minutes,
    date = excluded.date,
    difficulty = excluded.difficulty,
    timing = excluded.timing,
    is_custom = excluded.is_custom,
    payload_json = excluded.payload_json
`;

const SELECT_SQL = `
  SELECT payload_json
  FROM leaderboard_entries
  ORDER BY date DESC
  LIMIT ?
`;

const TRIM_SQL = `
  DELETE FROM leaderboard_entries
  WHERE id IN (
    SELECT id FROM leaderboard_entries ORDER BY date DESC LIMIT -1 OFFSET ?
  )
`;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra
    }
  });
}

function cleanName(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 24);
}

function integer(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function validateEntry(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const name = cleanName(raw.name);
  if (
    typeof raw.id !== 'string' ||
    raw.id.length < 1 ||
    raw.id.length > 80 ||
    !name ||
    !DIFFICULTIES.has(raw.difficulty) ||
    !TIMINGS.has(raw.timing) ||
    !integer(raw.score, 0, 100000) ||
    !integer(raw.hints, 0, 100) ||
    !integer(raw.durationMinutes, 0, 100000) ||
    !integer(raw.date, 0, 4102444800000) ||
    typeof raw.seed !== 'string' ||
    raw.seed.length > 80 ||
    typeof raw.rulesetVersion !== 'string' ||
    raw.rulesetVersion.length > 80 ||
    typeof raw.dictionaryId !== 'string' ||
    raw.dictionaryId.length > 80 ||
    typeof raw.dictionaryVersion !== 'string' ||
    raw.dictionaryVersion.length > 80 ||
    typeof raw.isCustom !== 'boolean'
  ) {
    return null;
  }

  const entry = {
    ...raw,
    name,
    bestWord: typeof raw.bestWord === 'string' ? raw.bestWord.slice(0, 120) : null,
    variantTag: typeof raw.variantTag === 'string' ? raw.variantTag.slice(0, 120) : null,
    recap: raw.recap && typeof raw.recap === 'object' && !Array.isArray(raw.recap) ? raw.recap : null
  };

  if (JSON.stringify(entry).length > 100000) return null;
  return entry;
}

async function getEntries(db) {
  const result = await db.prepare(SELECT_SQL).bind(MAX_ENTRIES).all();
  const rows = Array.isArray(result.results) ? result.results : [];
  const entries = [];
  for (const row of rows) {
    try {
      const entry = JSON.parse(row.payload_json);
      if (validateEntry(entry)) entries.push(entry);
    } catch {
      // A corrupt row should not make the complete public board unavailable.
    }
  }
  return entries;
}

export async function handleLeaderboard(request, env) {
  if (!env || !env.DB) return json({ error: 'leaderboard storage unavailable' }, 501);

  if (request.method === 'GET') {
    try {
      return json(await getEntries(env.DB));
    } catch {
      return json({ error: 'leaderboard storage unavailable' }, 503);
    }
  }

  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405, { allow: 'GET, POST' });
  }

  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_PAYLOAD_BYTES) return json({ error: 'payload too large' }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }

  if (!body || !Array.isArray(body.entries) || !body.entries.length || body.entries.length > MAX_BATCH) {
    return json({ error: 'entries must contain between 1 and 100 items' }, 400);
  }

  const entries = body.entries.map(validateEntry);
  if (entries.some((entry) => !entry)) return json({ error: 'one or more entries are invalid' }, 400);

  try {
    const statements = entries.map((entry) =>
      env.DB.prepare(UPSERT_SQL).bind(
        entry.id,
        entry.score,
        entry.hints,
        entry.durationMinutes,
        entry.date,
        entry.difficulty,
        entry.timing,
        entry.isCustom ? 1 : 0,
        JSON.stringify(entry)
      )
    );
    statements.push(env.DB.prepare(TRIM_SQL).bind(MAX_ENTRIES));
    await env.DB.batch(statements);
    return json({ acceptedIds: entries.map((entry) => entry.id) });
  } catch {
    return json({ error: 'leaderboard storage unavailable' }, 503);
  }
}
