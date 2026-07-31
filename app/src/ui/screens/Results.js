import { html } from '../html.js';
import {
  go,
  replayRun,
  shareSeed,
  playAnother,
  totals,
  me
} from '../../state/store.js';
import { buildLeaderboardRecap } from '../../state/leaderboardData.js';
import { RecapView } from './RecapView.js';

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
  const recap = buildLeaderboardRecap(run, t, player);

  const actions = html`
    <section class="row" style="gap:10px">
      <button class="btn lg" type="button" onClick=${replayRun}>Replay This Run</button>
      <button class="btn-outline lg" type="button" onClick=${shareSeed}>Share This Seed</button>
      <button class="btn-ghost lg" type="button" onClick=${playAnother}>Play Another</button>
    </section>
  `;

  return html`<${RecapView}
    recap=${recap}
    place=${place}
    boardLabel=${state.leaderboardSource === 'shared' ? 'Shared leaderboard' : 'Local leaderboard'}
    actions=${actions}
  />`;
}

export function compareEntries(a, b) {
  return (
    Number(b.score || 0) - Number(a.score || 0) ||
    Number(a.hints || 0) - Number(b.hints || 0) ||
    Number(a.durationMinutes || 0) - Number(b.durationMinutes || 0) ||
    Number(a.date || 0) - Number(b.date || 0)
  );
}
