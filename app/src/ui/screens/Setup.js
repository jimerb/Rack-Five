import { html, cx } from '../html.js';
import {
  go,
  setSetup,
  rerollSeed,
  startRun,
  toggleCustomRules,
  cap
} from '../../state/store.js';
import { effectiveRuleset } from '../../engine/ruleset.js';
import { HelpDot } from '../Help.js';

const TIMINGS = [
  { key: 'relaxed', name: 'Relaxed', value: 'Untimed', blurb: 'Solo puzzle pace, good for learning', tag: 'Default' },
  { key: 'standard', name: 'Standard', value: '3 minutes per turn', blurb: 'The normal game' },
  { key: 'blitz', name: 'Blitz', value: '90 seconds per turn', blurb: 'For experienced word players' }
];

export function Setup({ state }) {
  const ruleset = effectiveRuleset(state.lab);
  const setup = state.setup;
  const custom = state.lab.enabled;

  const difficulties = ['easy', 'medium', 'hard'].map((key) => ({
    key,
    name: cap(key),
    letters: ruleset.difficulty[key].budget + ' letters',
    blurb: ruleset.difficulty[key].blurb,
    tag: key === 'medium' ? 'Default' : key === 'hard' ? 'No rank-6 Rack Five' : ''
  }));

  const seconds = ruleset.timingSeconds[setup.timing];
  const summary =
    `${cap(setup.difficulty)} · ${ruleset.difficulty[setup.difficulty].budget} letters · ` +
    `${seconds === null ? 'Untimed' : formatClock(seconds) + ' per turn'} · 13 rounds`;

  return html`
    <main class="screen">
      <div class="screen-col w-940">
        <div>
          <div class="kicker">New run</div>
          <h1 class="page-title" style="margin-top:6px">Set up your game</h1>
        </div>

        <section>
          <div class="row" style="align-items:baseline;gap:10px;margin-bottom:10px">
            <h2 class="section-title">Difficulty</h2>
            <span class="body-13">Difficulty sets your letter budget — nothing else changes.</span>
          </div>
          <div class="grid g-216" role="radiogroup" aria-label="Difficulty">
            ${difficulties.map(
              (d) => html`
                <button
                  key=${d.key}
                  type="button"
                  role="radio"
                  aria-checked=${setup.difficulty === d.key}
                  class=${cx('choice', setup.difficulty === d.key && 'is-on')}
                  onClick=${() => setSetup({ difficulty: d.key })}
                >
                  <span class="choice-head">
                    <span class="choice-name">${d.name}</span>
                    ${d.tag && html`<span class="choice-tag">${d.tag}</span>`}
                  </span>
                  <span class="choice-value">${d.letters}</span>
                  <span class="choice-blurb">${d.blurb}</span>
                </button>
              `
            )}
          </div>
          ${setup.difficulty === 'hard' &&
          html`
            <div class="hard-note">
              <b>Hard</b>
              <span class="body-13">
                Every category stays reachable, but a rank-6 Rack Five cannot be made — five
                8-letter words need 40 letters and you only have
                ${ruleset.difficulty.hard.budget}.
              </span>
            </div>
          `}
        </section>

        <section>
          <h2 class="section-title" style="margin-bottom:10px">Timing</h2>
          <div class="grid g-216" role="radiogroup" aria-label="Timing">
            ${TIMINGS.map(
              (t) => html`
                <button
                  key=${t.key}
                  type="button"
                  role="radio"
                  aria-checked=${setup.timing === t.key}
                  class=${cx('choice', setup.timing === t.key && 'is-on')}
                  onClick=${() => setSetup({ timing: t.key })}
                >
                  <span class="choice-head">
                    <span class="choice-name">${t.name}</span>
                    ${t.tag && html`<span class="choice-tag">${t.tag}</span>`}
                  </span>
                  <span class="choice-value">
                    ${t.key === 'relaxed'
                      ? 'Untimed'
                      : formatClock(ruleset.timingSeconds[t.key]) + ' per turn'}
                  </span>
                  <span class="choice-blurb">${t.blurb}</span>
                </button>
              `
            )}
          </div>
        </section>

        <section class="grid g-280">
          <div class="panel panel-pad">
            <div class="card-title">Game length</div>
            <div class="row" style="margin-top:10px">
              <span class="length-pill is-on">Full · 13 rounds</span>
              <span class="length-pill is-soon" aria-disabled="true">
                Short · 6<span class="mini-soon">Coming soon</span>
              </span>
            </div>
            <p class="body-13" style="margin:10px 0 0">
              The short game waits until the upper-bonus question is settled.
            </p>
          </div>

          <div class="panel panel-pad">
            <div class="row" style="gap:8px">
              <div class="card-title">Seed</div>
              <${HelpDot} topic="seed" label="About seeds" />
            </div>
            <div class="row" style="gap:9px;margin-top:10px">
              <span class="seed-code">${setup.seed}</span>
              <button class="link-action" type="button" onClick=${rerollSeed}>Generate new</button>
            </div>
            <input
              class="text-input"
              style="margin-top:11px"
              value=${setup.seedInput}
              placeholder="or enter a shared run code"
              aria-label="Enter a shared run code"
              onInput=${(e) => setSetup({ seedInput: e.target.value, seedError: null })}
            />
            ${setup.seedError
              ? html`<p class="body-13 warn" style="margin:9px 0 0">${setup.seedError}</p>`
              : html`<p class="body-13" style="margin:9px 0 0">
                  Same seed and difficulty always deal the same racks and the same replacement luck.
                </p>`}
          </div>
        </section>

        <section class="setup-divider">
          <button
            class=${cx('rules-pill', custom && 'is-custom')}
            type="button"
            onClick=${toggleCustomRules}
            aria-pressed=${custom}
          >
            ${custom
              ? 'Custom Rules — this run will not enter standard leaderboards'
              : 'Standard Rules — leaderboard eligible'}
          </button>
          <button class="link-action" type="button" onClick=${() => go('lab')}>
            Advanced Gameplay → Gameplay Lab
          </button>
        </section>

        <section class="setup-start">
          <button class="btn xl" type="button" onClick=${() => startRun()}>Start Game</button>
          <span class="body-13">${summary}</span>
        </section>
      </div>
    </main>
  `;
}

export function formatClock(seconds) {
  if (seconds === null || seconds === undefined) return '—:—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + String(s).padStart(2, '0');
}
