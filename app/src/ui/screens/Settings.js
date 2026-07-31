import { html, cx } from '../html.js';
import {
  go,
  saveSettings,
  exportPlaytestData,
  clearLeaderboard,
  toast,
  DICTIONARIES
} from '../../state/store.js';

const THEMES = [
  {
    key: 'feltwork',
    name: 'Feltwork',
    kicker: 'Default',
    mood: 'Deep felt table, ivory tiles, brass',
    bg: '#0e1a17',
    grad: 'radial-gradient(130% 100% at 50% -10%,#183029 0%,#0e1a17 62%)',
    acc: '#d9a54c',
    accSoft: 'rgba(233,201,138,.10)',
    tile: 'linear-gradient(180deg,#f7f1e2 0%,#e5dbc4 100%)',
    tileText: '#1d2b25',
    rad: '6px',
    font: "'Space Grotesk',system-ui,sans-serif"
  },
  {
    key: 'midnight',
    name: 'Midnight',
    kicker: 'Dark alternate',
    mood: 'Quiet blue-grey, blurple line and glow',
    bg: '#161826',
    grad: 'radial-gradient(120% 90% at 15% 0%,#1e2133 0%,#161826 60%)',
    acc: '#9184d9',
    accSoft: 'rgba(145,132,217,.12)',
    tile: 'linear-gradient(180deg,#3f424d 0%,#2f323c 100%)',
    tileText: '#f3f5fe',
    rad: '8px',
    font: 'Inter,system-ui,sans-serif'
  },
  {
    key: 'sandbar',
    name: 'Sandbar',
    kicker: 'Light tabletop',
    mood: 'Warm cream board, terracotta and sage',
    bg: '#f5ead8',
    grad: 'none',
    acc: '#c67139',
    accSoft: '#fff2eb',
    tile: 'linear-gradient(180deg,#f9f4ed 0%,#f1e9da 100%)',
    tileText: '#2e2b25',
    rad: '16px',
    font: 'Caprasimo,system-ui,sans-serif'
  }
];

const TOGGLES = [
  ['sound', 'Sound effects', 'Tile clicks, placement, refresh and scoring.'],
  ['haptics', 'Haptics', 'Vibration on placement and commitment, where the device supports it.'],
  ['reduceMotion', 'Reduced motion', 'Removes tile lift, pop-in and the Jumbo glow.'],
  ['highContrast', 'High-contrast tiles', 'Thickens every status edge so provisional and permanent never rely on colour.'],
  ['largeLabels', 'Larger tile labels', 'Increases letter size on the rack and build bar.'],
  [
    'strictDictionary',
    'Strict dictionary',
    'Checks every word against the selected dictionary before it can be placed.'
  ],
  [
    'instrumentation',
    'Playtest instrumentation',
    'Asks which category you are aiming for before you build, again after the first refresh, and how each turn felt.'
  ]
];

export function Settings({ state }) {
  const s = state.settings;
  const dict = state.dict;
  // PRD §21.6: never change the dictionary version in the middle of an active run.
  const runInProgress = !!(state.run && state.turn && !state.run.completedAt);

  return html`
    <main class="screen">
      <div class="screen-col w-880">
        <h1 class="page-title">Settings</h1>

        <section>
          <div class="row" style="align-items:baseline;gap:10px;margin-bottom:12px">
            <h2 class="section-title">Theme</h2>
            <span class="body-13">Saved with your profile and applied everywhere.</span>
          </div>
          <div class="grid g-240" role="radiogroup" aria-label="Theme">
            ${THEMES.map(
              (t) => html`
                <button
                  key=${t.key}
                  type="button"
                  role="radio"
                  aria-checked=${s.theme === t.key}
                  class=${cx('theme-card', s.theme === t.key && 'is-on')}
                  onClick=${() => saveSettings({ theme: t.key })}
                >
                  <span
                    class="theme-preview"
                    style=${`background:${t.bg};background-image:${t.grad}`}
                  >
                    <span class="theme-chip" style=${`background:${t.accSoft};color:${t.acc}`}>
                      ${t.kicker}
                    </span>
                    <span class="theme-tiles">
                      ${['R', 'F', '5'].map(
                        (c) => html`
                          <span
                            key=${c}
                            style=${`border-radius:${t.rad};background:${t.tile};color:${t.tileText};font-family:${t.font};box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 3px 6px rgba(0,0,0,.35)`}
                          >
                            ${c}
                          </span>
                        `
                      )}
                      <span
                        style=${`height:5px;width:60%;border-radius:999px;background:${t.acc}`}
                      ></span>
                    </span>
                  </span>
                  <span class="theme-foot">
                    <span class="tn">
                      <span class="display" style="font-size:16px">${t.name}</span>
                      ${s.theme === t.key && html`<span class="selected-mark">Selected</span>`}
                    </span>
                    <span class="mood">${t.mood}</span>
                  </span>
                </button>
              `
            )}
          </div>
        </section>

        <section>
          <div class="row" style="align-items:baseline;gap:10px;margin-bottom:12px">
            <h2 class="section-title">Dictionary</h2>
            <span class="body-13">
              Stored with every run, so a replay is always judged by the list it was played on.
            </span>
          </div>
          ${runInProgress &&
          html`
            <div class="hard-note" style="margin:0 0 10px">
              <b>Locked</b>
              <span class="body-13">
                A run is in progress. The dictionary cannot change mid-run — the run recorded which
                list it was played on, and swapping now would make its replay wrong. Finish or
                discard the run first.
              </span>
            </div>
          `}
          <div class="col" style="gap:7px">
            ${DICTIONARIES.map((d) => {
              const selected = s.dictionaryId === d.id;
              const unavailable = !d.bundled;
              return html`
                <button
                  key=${d.id}
                  type="button"
                  class=${cx('dict-card', selected && 'is-on', (unavailable || runInProgress) && 'is-unavailable')}
                  aria-pressed=${selected}
                  disabled=${runInProgress && !selected}
                  onClick=${() =>
                    unavailable
                      ? toast(`${d.name} needs a licensed word list. Drop ${d.file} into data/dictionaries/ to enable it.`)
                      : saveSettings({ dictionaryId: d.id })}
                >
                  <span class="dict-head">
                    <span class="dict-name">${d.name}</span>
                    ${d.recommended && html`<span class="dict-tag">Recommended</span>`}
                    ${d.development && html`<span class="dict-tag grey">Development</span>`}
                    ${unavailable && html`<span class="dict-tag grey">File not included</span>`}
                    ${selected && html`<span class="selected-mark">Selected</span>`}
                  </span>
                  <span class="dict-meta">
                    <span>${d.language}</span>
                    <span>~${d.approxWords} words</span>
                    <span>${d.licence}</span>
                    ${selected &&
                    html`<span>
                      ${dict.status === 'ready'
                        ? `Loaded · ${dict.count.toLocaleString()} words`
                        : dict.status === 'loading'
                          ? 'Loading…'
                          : 'Could not load'}
                    </span>`}
                  </span>
                  <span class="dict-desc">${d.description}</span>
                </button>
              `;
            })}
          </div>
          <p class="body-13" style="margin-top:10px">
            More languages arrive as extra rows here plus a word-list file — no engine changes.
            ${!s.strictDictionary
              ? ' Strict dictionary is currently off, so words are not checked.'
              : ''}
          </p>
        </section>

        <section>
          <h2 class="section-title" style="margin-bottom:12px">Gameplay & accessibility</h2>
          <div class="col" style="gap:7px">
            ${TOGGLES.map(
              ([key, name, desc]) => html`
                <div key=${key} class="row-toggle">
                  <span class="rt-text">
                    <span class="rt-name">${name}</span>
                    <span class="rt-desc">${desc}</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked=${!!s[key]}
                    aria-label=${name}
                    class=${cx('switch', s[key] && 'is-on')}
                    onClick=${() => saveSettings({ [key]: !s[key] })}
                  >
                    <span class="knob"></span>
                  </button>
                </div>
              `
            )}

            <div class="row-toggle">
              <span class="rt-text">
                <span class="rt-name">Default rack sorting</span>
                <span class="rt-desc">Sorting changes presentation only — never tile identity or seeded replay.</span>
              </span>
              <span class="row" style="gap:6px;justify-content:flex-end">
                ${[
                  ['draw', 'Draw order'],
                  ['az', 'A–Z'],
                  ['value', 'Tile value']
                ].map(
                  ([k, label]) => html`
                    <button
                      key=${k}
                      type="button"
                      class=${cx('pill', s.sort === k && 'is-on')}
                      onClick=${() => saveSettings({ sort: k })}
                    >
                      ${label}
                    </button>
                  `
                )}
              </span>
            </div>

            <div class="row-toggle">
              <span class="rt-text">
                <span class="rt-name">Tutorial prompts</span>
                <span class="rt-desc">Replay the guided first turn from How to Play.</span>
              </span>
              <button
                class="btn-ghost sm"
                type="button"
                onClick=${() => {
                  saveSettings({ tutorialSeen: false });
                  toast('Tutorial reset. It will run again on your next new game.');
                }}
              >
                Reset tutorial
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 class="section-title" style="margin-bottom:12px">Advanced</h2>
          <div class="col" style="gap:7px">
            <button class="advanced-row accent" type="button" onClick=${() => go('lab')}>
              <span style="flex:1;min-width:0">
                <span class="ar-title">Gameplay Lab</span>
                <span class="ar-desc">
                  Balance controls for testing. Changing them creates a Custom Run and removes the
                  score from standard leaderboards.
                </span>
              </span>
              <span style="font-size:20px;color:var(--t-acc)">→</span>
            </button>

            <button class="advanced-row" type="button" onClick=${exportPlaytestData}>
              <span style="flex:1;min-width:0">
                <span class="rt-name">Export Playtest Data</span>
                <span class="ar-desc">
                  JSON event log plus a CSV turn summary. No personal data.
                </span>
              </span>
              <span style="font-size:20px;color:var(--t-dim)">↓</span>
            </button>

            <button class="advanced-row" type="button" onClick=${clearLeaderboard}>
              <span style="flex:1;min-width:0">
                <span class="rt-name">Clear local leaderboard</span>
                <span class="ar-desc">
                  Removes every stored score on this device. Saved runs and settings are untouched.
                </span>
              </span>
              <span style="font-size:20px;color:var(--t-dim)">×</span>
            </button>
          </div>
        </section>

        <p class="foot-note">
          Preferences and saved runs stay in this browser. ${
            state.leaderboardSource === 'shared'
              ? 'Submitted leaderboard scores are also shared with other players on this hosted build.'
              : 'Leaderboard scores remain on this device when no shared API is available.'
          }
        </p>
      </div>
    </main>
  `;
}
