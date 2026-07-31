import { html } from '../html.js';
import { closeLeaderboardRecap } from '../../state/store.js';
import { hasLeaderboardRecap } from '../../state/leaderboardData.js';
import { RecapView } from './RecapView.js';
import { compareEntries } from './Results.js';

export function LeaderboardRecap({ state }) {
  const entry = state.selectedLeaderboardEntry;
  if (!entry) {
    return html`
      <main class="screen">
        <div class="screen-col w-1000">
          <h1 class="page-title">No leaderboard entry selected</h1>
          <button class="btn" type="button" onClick=${closeLeaderboardRecap}>Back to leaderboards</button>
        </div>
      </main>
    `;
  }

  const board = state.leaderboard
    .filter((candidate) => candidate.difficulty === entry.difficulty)
    .filter((candidate) => candidate.timing === entry.timing)
    .filter((candidate) => !!candidate.isCustom === !!entry.isCustom)
    .sort(compareEntries);
  const place = board.findIndex((candidate) => candidate.id === entry.id) + 1;
  const recap = hasLeaderboardRecap(entry) ? entry.recap : legacyRecap(entry);

  return html`<${RecapView}
    recap=${recap}
    entry=${entry}
    place=${place}
    boardLabel=${state.leaderboardSource === 'shared' ? 'Shared leaderboard' : 'Local leaderboard'}
    onBack=${closeLeaderboardRecap}
  />`;
}

function legacyRecap(entry) {
  return {
    version: 0,
    seed: entry.seed,
    difficulty: entry.difficulty,
    timing: entry.timing,
    rulesetVersion: entry.rulesetVersion,
    rngVersion: '—',
    dictionaryId: entry.dictionaryId,
    dictionaryVersion: entry.dictionaryVersion,
    isCustom: !!entry.isCustom,
    interrupted: !!entry.interrupted,
    startedAt: entry.date - Math.max(1, entry.durationMinutes || 1) * 60000,
    completedAt: entry.date,
    durationSeconds: Math.max(1, entry.durationMinutes || 1) * 60,
    card: {},
    totals: {
      scorecard: entry.scorecard || 0,
      upper: 0,
      lower: entry.scorecard || 0,
      bonus: entry.upperBonus || 0,
      threshold: '—',
      wordBank: entry.wordBank || 0,
      jumbo: entry.jumbo || 0,
      hints: entry.hints || 0,
      hintPointsSpent: 0,
      dictionaryMisses: 0,
      missPenaltyFree: 0,
      missPenalty: 0,
      total: entry.score || 0
    },
    jumboWord: entry.jumboWord || '',
    turns: []
  };
}
