import { html, cx } from '../html.js';
import {
  go,
  replayRun,
  shareSeed,
  playAnother,
  totals,
  me,
  cap,
  categoryName
} from '../../state/store.js';
import { CATEGORIES } from '../../engine/categories.js';
import { dictionaryMeta } from '../../engine/dictionary.js';
import { formatDate } from './Home.js';

export function Results({ state }) {
  const run = state.run;
  if (!run || !run.completedAt) {
    return html`
      <main class="screen">
        <div class="screen-col w-1000">
          <h1 class="page-title">No finished run yet</h1>
          <p class="body-14">Play thirteen turns and the breakdown lands here.</p>
          <div><button class="btn" type="button" onClick=${() => go('setup')}>Set up a run</button></div>
        </div>
      </main>
    `;
  }

  const t = totals(run);
  const player = me(run);
  const board = state.leaderboard
    .filter((b) => b.difficulty === run.difficulty && !b.isCustom)
    .sort(compareEntries);
  const place = board.findIndex((b) => b.id === run.runId) + 1;
  const isPB = !run.isCustom && place === 1 && board.length > 0;
  const shareText = `Try my Rack Five run: ${cap(run.difficulty)}, ${cap(run.timing)}, seed ${run.seed}. I scored ${t.total}.`;

  return html`
    <main class="screen">
      <div class="screen-col w-1000">
        <section class="result-head">
          <div>
            ${isPB && html`<div class="pb-badge">Personal best</div>`}
            <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--t-dim)">
              Final score
            </div>
            <div class="final-score tnum">${t.total}</div>
          </div>

          <div class="breakdown">
            <div class="bd-row">
              <span class="muted">Scorecard</span><span class="leader"></span>
              <strong class="tnum">${t.upper + t.lower}</strong>
            </div>
            <div class="bd-row">
              <span class="muted">Upper bonus · ${t.upper} of ${t.threshold}</span>
              <span class="leader"></span><strong class="tnum">+${t.bonus}</strong>
            </div>
            <div class="bd-row">
              <span class="muted">Word Bank</span><span class="leader"></span>
              <strong class="tnum">+${player.wordBank}</strong>
            </div>
            <div class="bd-row">
              <span class="muted">Jumbo${player.jumboWord ? ' · ' + player.jumboWord : ''}</span>
              <span class="leader"></span><strong class="tnum">+${player.jumboPoints}</strong>
            </div>
            <div class="bd-row dim">
              <span>Hints used · ${player.hintsUsed}</span><span class="leader"></span>
              <span class="tnum">−${player.hintPointsSpent} already off the bank</span>
            </div>
            <div class="bd-row total">
              <strong>Total</strong><span class="leader" style="border:0"></span>
              <strong class="tnum">${t.total}</strong>
            </div>
          </div>
        </section>

        <section class="row" style="gap:10px">
          <button class="btn lg" type="button" onClick=${replayRun}>Replay This Run</button>
          <button class="btn-outline lg" type="button" onClick=${shareSeed}>Share This Seed</button>
          <button class="btn-ghost lg" type="button" onClick=${playAnother}>Play Another</button>
        </section>

        <section class="row" style="gap:12px;align-items:stretch">
          <div class="panel" style="flex:1 1 300px;padding:16px 18px">
            <div class="kicker-sm" style="margin-bottom:10px">Run identity</div>
            <div class="row" style="gap:8px 22px;font-size:13px">
              <span class="muted">Difficulty <strong style="color:var(--t-text)">${cap(run.difficulty)}</strong></span>
              <span class="muted">Timing <strong style="color:var(--t-text)">${cap(run.timing)}</strong></span>
              <span class="muted">Seed <strong class="display accent" style="letter-spacing:.08em">${run.seed}</strong></span>
              <span class="muted">Ruleset <strong style="color:var(--t-text)">${run.rulesetVersion}</strong></span>
              <span class="muted">
                Dictionary${' '}
                <strong style="color:var(--t-text)">${dictionaryMeta(run.dictionaryId).name}</strong>
              </span>
              <span class="muted">RNG <strong style="color:var(--t-text)">${run.rngVersion}</strong></span>
            </div>
            <div class="share-text">${shareText}<br />Run code: ${run.seed}·${cap(run.difficulty)[0]}·${run.rulesetVersion}</div>
          </div>

          <div class="panel" style="flex:1 1 220px;padding:16px 18px">
            <div class="kicker-sm" style="margin-bottom:10px">Leaderboard</div>
            <div class="place-figure">${run.isCustom ? '—' : place ? '#' + place : '—'}</div>
            <div class="body-13" style="margin:0">
              Local ${run.difficulty} board · ${run.timing}
            </div>
            ${run.isCustom &&
            html`<div class="body-13 warn" style="margin-top:10px">
              Custom Run — not eligible for standard boards.
            </div>`}
            ${run.interrupted &&
            html`<div class="body-13" style="margin-top:10px">
              This run was interrupted and resumed. It is still saved locally.
            </div>`}
          </div>
        </section>

        <section>
          <h2 class="section-title" style="margin-bottom:10px">Completed scorecard</h2>
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:6px">
            ${CATEGORIES.map(
              (c) => html`
                <div key=${c.key} class=${cx('result-card-row', !player.card[c.key] && 'zero')}>
                  <span>${c.name}</span>
                  <strong class="tnum">${player.card[c.key] === null ? '—' : player.card[c.key]}</strong>
                </div>
              `
            )}
            <div class="result-card-row" style="border:1px dashed var(--t-line-2);background:transparent">
              <span>Upper bonus</span><strong class="tnum">+${t.bonus}</strong>
            </div>
          </div>
        </section>

        <section>
          <h2 class="section-title" style="margin-bottom:10px">Turn breakdown</h2>
          <div class="col" style="gap:5px">
            ${run.history.map(
              (h) => html`
                <div key=${h.turnNo} class="turn-row">
                  <span class="tn">${h.turnNo}</span>
                  <span class="tw">${h.words.join('  ') || '—'}</span>
                  <span class="muted tnum">ranks ${h.ranks.join(' · ')}</span>
                  <span class="accent">${categoryName(h.category)} +${h.categoryPoints}</span>
                  <span class="muted">banked ${h.bankedWord || '—'} +${h.bankedWordValue}</span>
                  ${h.jumboAwarded && html`<span class="accent">Jumbo</span>`}
                </div>
              `
            )}
          </div>
          <p class="body-13" style="margin-top:10px">
            Completed ${formatDate(run.completedAt)} · ${Math.max(
              1,
              Math.round((run.completedAt - run.startedAt) / 60000)
            )} minutes.
          </p>
        </section>
      </div>
    </main>
  `;
}

export function compareEntries(a, b) {
  return (
    b.score - a.score ||
    a.hints - b.hints ||
    a.durationMinutes - b.durationMinutes ||
    a.date - b.date
  );
}
