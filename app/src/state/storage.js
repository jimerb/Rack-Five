// Local persistence. Phase 1 keeps everything on the device (PRD §22.3).
//
// Four independent keys so a corrupt save can never cost you your settings or
// your leaderboard.

const PREFIX = 'rf5.';
const SCHEMA = 1;

export const KEYS = {
  settings: PREFIX + 'settings',
  save: PREFIX + 'save',
  leaderboard: PREFIX + 'leaderboard',
  leaderboardPending: PREFIX + 'leaderboard-pending',
  lab: PREFIX + 'lab',
  playtest: PREFIX + 'playtest'
};

export function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__schema && parsed.__schema !== SCHEMA) return fallback;
    return parsed && '__data' in parsed ? parsed.__data : parsed;
  } catch (err) {
    console.warn('[Rack Five] Could not read ' + key, err);
    return fallback;
  }
}

export function write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ __schema: SCHEMA, __data: data }));
    return true;
  } catch (err) {
    console.warn('[Rack Five] Could not write ' + key, err);
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    /* private mode */
  }
}

export function download(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
