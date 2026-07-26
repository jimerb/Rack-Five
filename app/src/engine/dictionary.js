// Dictionary registry and loader.
//
// Rulebook §10 states the practical rule: any entry in the selected dictionary
// is legal unless it is a proper noun, an abbreviation, a hyphenated term, or
// contains an apostrophe. The lists below are already filtered that way, so
// membership is the only check needed at play time.
//
// PRD §26.1 leaves the *official* dictionary as an open product decision. Until
// an owner settles it, the default is the only list that can be shipped without
// a licence: ENABLE.
//
// Adding a language later is adding a row to this registry plus a word-list
// file. Nothing else in the engine changes.

export const DICTIONARIES = [
  {
    id: 'enable',
    name: 'ENABLE',
    language: 'English',
    file: 'enable1.txt',
    approxWords: '172,800',
    licence: 'Public domain',
    bundled: true,
    recommended: true,
    summary: 'Open, public-domain list. The default.',
    description:
      'The Enhanced North American Benchmark Lexicon. Broad everyday and literary English with inflections, no proper nouns, abbreviations or hyphenated forms. Light on medical, chemical and highly technical jargon, which keeps hints readable and invalid-word arguments rare. Free to redistribute, so it is the only list we can ship.'
  },
  {
    id: 'twl06',
    name: 'TWL06 / NWL',
    language: 'English (North America)',
    file: 'twl06.txt',
    approxWords: '178,700',
    licence: 'Licensed — file not included',
    bundled: false,
    summary: 'North American tournament list.',
    description:
      'The tournament word list used in North American club and tournament play. Very close to ENABLE with a stricter, actively curated inclusion policy. Requires a licence, so the word-list file is not distributed with this build — drop twl06.txt into data/dictionaries/ to enable it.'
  },
  {
    id: 'sowpods',
    name: 'Collins / SOWPODS',
    language: 'English (international)',
    file: 'sowpods.txt',
    approxWords: '279,000',
    licence: 'Licensed — file not included',
    bundled: false,
    summary: 'International list. Much larger and more obscure.',
    description:
      'The international tournament list. Adds British and Commonwealth spellings plus a long tail of dialect, archaic and technical words. Roughly 100,000 entries larger than ENABLE, which makes long words markedly easier to find and shifts scoring — treat scores from this list as a separate leaderboard population. Requires a licence.'
  },
  {
    id: 'demo',
    name: 'Demo subset',
    language: 'English',
    file: 'demo-subset.txt',
    approxWords: '1,300',
    licence: 'Public domain',
    bundled: true,
    development: true,
    summary: 'Tiny list for offline development checks.',
    description:
      'A ~1,300-word subset used to exercise the validation path without loading a full list. Far too small for real play — most valid words will be rejected. Development only.'
  }
];

export const DEFAULT_DICTIONARY_ID = 'enable';

const cache = new Map(); // id → { status, words:Set, byLength:Map, count, version }

export function dictionaryMeta(id) {
  return DICTIONARIES.find((d) => d.id === id) || DICTIONARIES[0];
}

export function dictionaryState(id) {
  return cache.get(id) || { status: 'idle', count: 0 };
}

/**
 * Load a word list. Returns { status:'ready'|'unavailable', words, byLength }.
 * A missing licensed file is a normal outcome, not an error — the caller falls
 * back and the UI says so plainly.
 */
export async function loadDictionary(id, base = './data/dictionaries/') {
  const meta = dictionaryMeta(id);
  const existing = cache.get(meta.id);
  if (existing && (existing.status === 'ready' || existing.status === 'unavailable')) {
    return existing;
  }
  if (existing && existing.promise) return existing.promise;

  const entry = { status: 'loading', count: 0 };
  const promise = (async () => {
    try {
      const res = await fetch(base + meta.file, { cache: 'force-cache' });
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      const words = new Set();
      const byLength = new Map();
      for (const raw of text.split('\n')) {
        const word = raw.trim().toUpperCase();
        if (word.length < 3 || !/^[A-Z]+$/.test(word)) continue;
        words.add(word);
        let bucket = byLength.get(word.length);
        if (!bucket) byLength.set(word.length, (bucket = []));
        bucket.push(word);
      }
      const ready = {
        status: 'ready',
        words,
        byLength,
        count: words.size,
        id: meta.id,
        version: meta.id + '@' + words.size
      };
      cache.set(meta.id, ready);
      return ready;
    } catch (err) {
      const unavailable = {
        status: 'unavailable',
        words: new Set(),
        byLength: new Map(),
        count: 0,
        id: meta.id,
        version: meta.id + '@unavailable',
        reason: meta.bundled
          ? 'The word-list file could not be loaded.'
          : 'This list is licensed and is not distributed with the build.'
      };
      cache.set(meta.id, unavailable);
      return unavailable;
    }
  })();

  entry.promise = promise;
  cache.set(meta.id, entry);
  return promise;
}

export function isWord(dict, word) {
  return !!dict && dict.status === 'ready' && dict.words.has(String(word).toUpperCase());
}
