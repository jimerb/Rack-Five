// Sound effects, synthesised with the Web Audio API.
//
// The design ships no binary assets, so every sound here is generated: short
// wooden clicks for tiles, a brass swell for scoring, a rising arpeggio for
// Jumbo. Muting is honoured at the source — nothing is scheduled when sound is
// off, so a muted game costs nothing.
//
// PRD §20: the timer must not be the only indicator that time is nearly
// finished, hence the tick and the warning chime.

let ctx = null;
let master = null;
let enabled = true;
let hapticsEnabled = true;

function audio() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.32;
  master.connect(ctx.destination);
  return ctx;
}

export function configureAudio({ sound, haptics }) {
  enabled = !!sound;
  hapticsEnabled = !!haptics;
}

/** Browsers require a user gesture before audio starts. Called on first input. */
export function unlockAudio() {
  const c = audio();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function tone({ freq, type = 'sine', duration = 0.12, gain = 0.5, sweep = 0, delay = 0 }) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise({ duration = 0.06, gain = 0.25, delay = 0, highpass = 1200 }) {
  const c = audio();
  if (!c) return;
  const frames = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(c.currentTime + delay);
}

const SOUNDS = {
  tilePick: () => { tone({ freq: 520, type: 'triangle', duration: 0.05, gain: 0.28, sweep: 90 }); noise({ duration: 0.03, gain: 0.1 }); },
  tileReturn: () => tone({ freq: 330, type: 'triangle', duration: 0.06, gain: 0.22, sweep: -60 }),
  place: () => {
    tone({ freq: 392, type: 'triangle', duration: 0.1, gain: 0.32 });
    tone({ freq: 587, type: 'sine', duration: 0.16, gain: 0.26, delay: 0.05 });
    noise({ duration: 0.05, gain: 0.14 });
  },
  invalid: () => { tone({ freq: 190, type: 'sawtooth', duration: 0.16, gain: 0.16, sweep: -50 }); },
  dismantle: () => { noise({ duration: 0.09, gain: 0.16, highpass: 600 }); tone({ freq: 240, type: 'triangle', duration: 0.08, gain: 0.18, sweep: -70 }); },
  refresh: () => {
    noise({ duration: 0.28, gain: 0.2, highpass: 800 });
    tone({ freq: 300, type: 'triangle', duration: 0.14, gain: 0.2, delay: 0.06 });
    tone({ freq: 450, type: 'triangle', duration: 0.18, gain: 0.2, delay: 0.16 });
  },
  select: () => tone({ freq: 660, type: 'sine', duration: 0.06, gain: 0.2 }),
  score: () => {
    [523.25, 659.25, 783.99].forEach((f, i) =>
      tone({ freq: f, type: 'sine', duration: 0.34, gain: 0.3, delay: i * 0.06 })
    );
  },
  jumbo: () => {
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', duration: 0.5, gain: 0.3, delay: i * 0.09 })
    );
  },
  hint: () => { tone({ freq: 880, type: 'sine', duration: 0.1, gain: 0.22 }); tone({ freq: 1174, type: 'sine', duration: 0.14, gain: 0.18, delay: 0.08 }); },
  warn: () => { tone({ freq: 740, type: 'square', duration: 0.09, gain: 0.14 }); tone({ freq: 740, type: 'square', duration: 0.09, gain: 0.14, delay: 0.16 }); },
  tick: () => tone({ freq: 1200, type: 'square', duration: 0.02, gain: 0.06 }),
  timeout: () => { tone({ freq: 300, type: 'sawtooth', duration: 0.5, gain: 0.2, sweep: -160 }); },
  finish: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, type: 'sine', duration: 0.6, gain: 0.28, delay: i * 0.11 })
    );
  },
  // Deliberately not a fanfare. `finish` is the four-note rise that means the
  // game is over, so the opening is a short two-note lift with a triangle body
  // and a soft brush — recognisable as a beginning, impossible to mistake for
  // the ending.
  gameStart: () => {
    noise({ duration: 0.2, gain: 0.12, highpass: 500 });
    tone({ freq: 349.23, type: 'triangle', duration: 0.28, gain: 0.26, sweep: 40 });
    tone({ freq: 523.25, type: 'sine', duration: 0.42, gain: 0.24, delay: 0.13 });
  }
};

const HAPTICS = {
  tilePick: 8,
  tileReturn: 6,
  place: [12, 20, 14],
  invalid: [24, 40, 24],
  dismantle: 10,
  refresh: [18, 30, 18, 30, 26],
  select: 6,
  score: [20, 30, 40],
  jumbo: [30, 40, 30, 40, 60],
  hint: 12,
  warn: [16, 60, 16],
  timeout: [40, 60, 40],
  finish: [30, 50, 30, 50, 70],
  gameStart: [18, 40, 28]
};

export function play(name) {
  if (enabled && SOUNDS[name]) {
    try { SOUNDS[name](); } catch (err) { /* audio is never worth breaking a turn over */ }
  }
  if (hapticsEnabled && HAPTICS[name] && navigator.vibrate) {
    try { navigator.vibrate(HAPTICS[name]); } catch (err) { /* unsupported */ }
  }
}
