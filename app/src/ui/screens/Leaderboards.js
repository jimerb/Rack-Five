import { html, cx } from '../html.js';
import { setLbView, cap } from '../../state/store.js';
import { compareEntries } from './Results.js';
import { formatDate } from './Home.js';

const TIMINGS = ['all', 'relaxed', 'standard', 'blitz'];

export function Leaderboards({ state }) {
  const view = state.lbView;
  const rows = state.leaderboard
    .filter((b) => b.difficulty === view.difficulty)
    .filter((b) => view.timing === 'all' || b.timing === view.timing)
    .sort(compareEntries);

  const standard = rows.filter((b) => !b.isCustom);
  const custom = rows.filter((b) => b.isCustom);

  return html`
    <main class="screen">
      <div class="screen-col w-960">
        <div>
          <h1 class="page-title">Local leaderboards</h1>
          <p class="body-14" style="margin-top:6px;max-width:60ch">
            Difficulties are kept apart on purpose. An Easy player gets more completed patterns, more
            Word Bank chances and a better shot at the upper bonus, so the scores aren’t comparable.
          </p>
        </div>

        <div class="row" style="gap:7px">
          ${['easy', 'medium', 'hard'].map(
            (k) => html`
              <button
                key=${k}
                type="button"
                class=${cx('tab', view.difficulty === k && 'is-on')}
                onClick=${() => setLbView({ difficulty: k })}
              >
                ${cap(k)}
              </button>
            `
          )}
          <span class="tab is-disabled" aria-disabled="true">
            Friends<span style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Coming soon</span>
          </span>
        </div>

        <div class="row" style="gap:6px">
          <span class="label-cap" style="margin-right:4px">Timing</span>
          ${TIMINGS.map(
            (k) => html`
              <button
                key=${k}
                type="button"
                class=${cx('pill', view.timing === k && 'is-on')}
                onClick=${() => setLbView({ timing: k })}
              >
                ${k === 'all' ? 'All timings' : cap(k)}
              </button>
            `
          )}
        </div>

        ${!rows.length &&
        html`
          <div class="lb-empty">
            <div class="chips" aria-hidden="true">
              ${[1, 2, 3, 4, 5, 6].map((r) => html`<span key=${r}>${r}</span>`)}
            </div>
            <div class="display" style="font-size:20px">No ${cap(view.difficulty)} runs yet</div>
            <p class="body-14" style="max-width:40ch;margin:0">
              Finish thirteen turns on ${cap(view.difficulty)} and your score lands here.
            </p>
          </div>
        `}

        ${standard.length > 0 &&
        html`
          <section class="col" style="gap:6px">
            <div class="kicker-sm">Standard rules</div>
            ${standard.map((b, i) => row(b, i + 1, state))}
          </section>
        `}

        ${custom.length > 0 &&
        html`
          <section class="col" style="gap:6px;margin-top:6px">
            <div class="kicker-sm">Custom runs · kept apart from the standard board</div>
            ${custom.map((b, i) => row(b, i + 1, state))}
          </section>
        `}

        ${rows.length > 0 &&
        html`<p class="body-13" style="margin:0">
          Ties break on fewer hints, then shorter duration, then earlier completion.
        </p>`}
      </div>
    </main>
  `;
}

function row(b, place, state) {
  return html`
    <div key=${b.id} class=${cx('lb-row', state.lastEntryId === b.id && 'is-latest')}>
      <span class="lb-place">${place}</span>
      <span class="lb-score tnum">${b.score}</span>
      <span class="lb-mid">
        <span style="font-size:13px">
          ${cap(b.timing)} · ${formatDate(b.date)} · ${b.durationMinutes} min
          ${b.interrupted ? ' · interrupted' : ''}
        </span>
        <span class="lb-meta tnum">
          card ${b.scorecard} · bank ${b.wordBank} · jumbo ${b.jumbo} · upper ${b.upperBonus} ·
          hints ${b.hints}
        </span>
      </span>
      <span class="lb-seed">${b.seed}</span>
      ${b.isCustom
        ? html`<span class="badge-custom">Custom</span>`
        : html`<span class="badge-soon">Standard</span>`}
    </div>
  `;
}
