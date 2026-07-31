import { html, cx } from '../html.js';
import { CATEGORIES } from '../../engine/categories.js';
import { categoryName, go, goPlay } from '../../state/store.js';
import { dictionaryMeta } from '../../engine/dictionary.js';
import { formatDate } from './Home.js';

function dictionaryName(id) {
  try {
    return dictionaryMeta(id).name;
  } catch {
    return id || 'Unknown dictionary';
  }
}

/** Shared presentation for the live Results screen and historical recaps. */
export function RecapView({ recap, entry = null, place = 0, boardLabel = 'Leaderboard', actions = null, onBack = null }) {
  const t = recap.totals || {};
  const card = recap.card || {};
  const turns = Array.isArray(recap.turns) ? recap.turns : [];
  const shareText = `Try my Rack Five run: ${cap(recap.difficulty)}, ${cap(recap.timing)}, seed ${recap.seed}. I scored ${t.total}.`;
  const durationMinutes = Math.max(1, Math.round((recap.durationSeconds || 0) / 60));
  const historical = !!entry;

  return html`
    <main class="screen">
      <div class="screen-col w-1000">
        <header class="recap-topbar" aria-label="Finished run navigation">
          <button class="recap-brand" type="button" onClick=${() => go('home')}>
            Rack Five
          </button>
          <span class="recap-context">${historical ? 'Historical recap' : 'Finished run'}</span>
          <nav class="recap-links" aria-label="Recap destinations">
            <button class="recap-link" type="button" onClick=${goPlay}>Play</button>
            <button
              class=${cx('recap-link', historical && 'is-active')}
              type="button"
              onClick=${() => go('leaderboards')}
              aria-current=${historical ? 'page' : undefined}
            >
              Leaderboards
            </button>
            <button class="recap-link" type="button" onClick=${() => go('settings')}>Settings</button>
          </nav>
        </header>

        ${onBack &&
        html`<button class="link-action" type="button" onClick=${onBack}>← Back to leaderboards</button>`}

        <section class="result-head">
          <div>
            ${!historical && place === 1 && html`<div class="pb-badge">Personal best</div>`}
            ${historical && html`<div class="kicker-sm" style="margin-bottom:10px">Historical recap</div>`}
            <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--t-dim)">
              Final score
            </div>
            <div class="final-score tnum">${t.total ?? recap.score ?? '—'}</div>
          </div>

          <div class="breakdown">
            <div class="bd-row">
              <span class="muted">Scorecard</span><span class="leader"></span>
              <strong class="tnum">${t.scorecard ?? 0}</strong>
            </div>
            <div class="bd-row">
              <span class="muted">Upper bonus · ${t.upper ?? 0} of ${t.threshold ?? '—'}</span>
              <span class="leader"></span><strong class="tnum">+${t.bonus ?? 0}</strong>
            </div>
            <div class="bd-row">
              <span class="muted">Word Bank</span><span class="leader"></span>
              <strong class="tnum">+${t.wordBank ?? 0}</strong>
            </div>
            <div class="bd-row">
              <span class="muted">Jumbo${recap.jumboWord ? ' · ' + recap.jumboWord : ''}</span>
              <span class="leader"></span><strong class="tnum">+${t.jumbo ?? 0}</strong>
            </div>
            <div class="bd-row dim">
              <span>Hints used · ${t.hints ?? 0}</span><span class="leader"></span>
              <span class="tnum">−${t.hintPointsSpent ?? 0} already off the bank</span>
            </div>
            ${t.missPenalty > 0 &&
            html`<div class="bd-row">
              <span class="muted">Dictionary misses · ${t.dictionaryMisses ?? 0}, ${t.missPenaltyFree ?? 0} free</span>
              <span class="leader"></span><strong class="tnum">−${t.missPenalty}</strong>
            </div>`}
            <div class="bd-row total">
              <strong>Total</strong><span class="leader" style="border:0"></span>
              <strong class="tnum">${t.total ?? recap.score ?? 0}</strong>
            </div>
          </div>
        </section>

        ${actions}

        <section class="row" style="gap:12px;align-items:stretch">
          <div class="panel" style="flex:1 1 300px;padding:16px 18px">
            <div class="kicker-sm" style="margin-bottom:10px">Run identity</div>
            <div class="row" style="gap:8px 22px;font-size:13px">
              ${historical && html`<span class="muted">Player <strong style="color:var(--t-text)">${entry.name || 'Anonymous'}</strong></span>`}
              <span class="muted">Difficulty <strong style="color:var(--t-text)">${cap(recap.difficulty)}</strong></span>
              <span class="muted">Timing <strong style="color:var(--t-text)">${cap(recap.timing)}</strong></span>
              <span class="muted">Seed <strong class="display accent" style="letter-spacing:.08em">${recap.seed}</strong></span>
              <span class="muted">Ruleset <strong style="color:var(--t-text)">${recap.rulesetVersion || '—'}</strong></span>
              <span class="muted">Dictionary <strong style="color:var(--t-text)">${dictionaryName(recap.dictionaryId)}</strong></span>
              <span class="muted">RNG <strong style="color:var(--t-text)">${recap.rngVersion || '—'}</strong></span>
            </div>
            ${!historical && html`<div class="share-text">${shareText}<br />Run code: ${recap.seed}·${cap(recap.difficulty)[0]}·${recap.rulesetVersion}</div>`}
          </div>

          <div class="panel" style="flex:1 1 220px;padding:16px 18px">
            <div class="kicker-sm" style="margin-bottom:10px">${boardLabel}</div>
            <div class="place-figure">${recap.isCustom ? '—' : place ? '#' + place : '—'}</div>
            <div class="body-13" style="margin:0">
              ${historical ? 'Shared score' : 'Current run'} · ${cap(recap.difficulty)} board · ${cap(recap.timing)}
            </div>
            ${recap.isCustom &&
            html`<div class="body-13 warn" style="margin-top:10px">Custom Run — not eligible for standard boards.</div>`}
            ${recap.interrupted &&
            html`<div class="body-13" style="margin-top:10px">This run was interrupted and resumed.</div>`}
          </div>
        </section>

        <section>
          <h2 class="section-title" style="margin-bottom:10px">Completed scorecard</h2>
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:6px">
            ${CATEGORIES.map(
              (c) => html`
                <div key=${c.key} class=${cx('result-card-row', !card[c.key] && 'zero')}>
                  <span>${c.name}</span>
                  <strong class="tnum">${card[c.key] === null || card[c.key] === undefined ? '—' : card[c.key]}</strong>
                </div>
              `
            )}
            <div class="result-card-row" style="border:1px dashed var(--t-line-2);background:transparent">
              <span>Upper bonus</span><strong class="tnum">+${t.bonus ?? 0}</strong>
            </div>
          </div>
        </section>

        <section>
          <h2 class="section-title" style="margin-bottom:10px">Turn breakdown</h2>
          ${turns.length
            ? html`<div class="col" style="gap:5px">
                ${turns.map(
                  (h) => html`
                    <div key=${h.turnNo} class="turn-row">
                      <span class="tn">${h.turnNo}</span>
                      <span class="tw">${(h.words || []).join('  ') || '—'}</span>
                      <span class="muted tnum">ranks ${(h.ranks || []).join(' · ')}</span>
                      <span class="accent">${categoryName(h.category)} +${h.categoryPoints ?? 0}</span>
                      <span class="muted">banked ${h.bankedWord || '—'} +${h.bankedWordValue ?? 0}</span>
                      ${h.jumboAwarded && html`<span class="accent">Jumbo</span>`}
                    </div>
                  `
                )}
              </div>`
            : html`<p class="body-13">Detailed recap unavailable for this older entry.</p>`}
          <p class="body-13" style="margin-top:10px">
            Completed ${formatDate(recap.completedAt)} · ${durationMinutes} minutes.
          </p>
        </section>
      </div>
    </main>
  `;
}

function cap(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : '';
}
