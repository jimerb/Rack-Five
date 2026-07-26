// Seeded deterministic generation — rulebook §9, "the harness".
//
// Never call Math.random() for gameplay. Every run is fully determined by
// (seed, difficulty, rulesetVersion). This is what buys replays, shareable run
// codes, daily challenges and future server-side verification for free.
//
// rngVersion: 'mulberry32-fnv1a-v1' — recorded on every run so a future change
// to this file cannot silently invalidate a historical replay.

/** FNV-1a, 32-bit. */
export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG. Returns a function producing floats in [0, 1). */
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A PRNG bound to one turn of one run. */
export function turnRandom(seed, turnNo) {
  return mulberry32(hashSeed(seed + ':' + turnNo));
}

/** In-place Fisher-Yates using a supplied PRNG. */
export function shuffle(list, rnd) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — spoken and typed codes

/** A fresh share code, e.g. RF-7K4M2. Seed *creation* may use Math.random; seed *use* may not. */
export function newSeed() {
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)];
  }
  return 'RF-' + s;
}

/** Accepts "rf-7k4m2", "7K4M2", " RF-7K4M2 " → "RF-7K4M2". Returns null if unusable. */
export function normaliseSeed(input) {
  if (!input) return null;
  let s = String(input).trim().toUpperCase().replace(/\s+/g, '');
  if (s.startsWith('RF-')) s = s.slice(3);
  s = s.replace(/[^A-Z0-9]/g, '');
  if (s.length < 3 || s.length > 12) return null;
  return 'RF-' + s;
}
