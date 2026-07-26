import { html } from '../html.js';
import { go, goPlay, requestNewRun, resumeRun, cap } from '../../state/store.js';
import { standardRuleset } from '../../engine/ruleset.js';

const HERO_TILES = [
  { l: 'R', v: 1 },
  { l: 'A', v: 1 },
  { l: 'C', v: 3 },
  { l: 'K', v: 5 },
  { l: '5', v: '' }
];

export function Home({ state }) {
  const ruleset = standardRuleset();
  const standardRuns = state.leaderboard.filter((b) => !b.isCustom);
  const best = standardRuns.reduce((a, b) => (!a || b.score > a.score ? b : a), null);
  const bestWord = state.leaderboard.reduce(
    (a, b) => (b.bestWordValue > (a ? a.bestWordValue : 0) ? b : a),
    null
  );
  const bonusRate = standardRuns.length
    ? Math.round((standardRuns.filter((b) => b.upperBonus > 0).length / standardRuns.length) * 100)
    : 0;
  const inRun = !!(state.run && state.turn && !state.run.completedAt);

  return html`
    <main class="screen">
      <div class="screen-col w-1020">
        <section class="hero">
          <div class="hero-copy">
            <div class="kicker hero-kicker">Solo Arcade</div>
            <h1 class="hero-title">Five words.<br />One scorecard.</h1>
            <p class="hero-body">
              A rack of letters instead of five dice. Each word’s length becomes its rank — then it
              plays exactly like a die face. Thirteen turns to fill the card.
            </p>
          </div>
          <div class="hero-tiles" aria-hidden="true">
            ${HERO_TILES.map(
              (t) => html`
                <div class="tile" key=${t.l}>
                  <span class="tl">${t.l}</span>
                  <span class="tv">${t.v}</span>
                </div>
              `
            )}
          </div>
        </section>

        <section class="row" style="gap:12px">
          <button class="btn lg" type="button" onClick=${requestNewRun}>Play Solo</button>
          ${inRun &&
          html`
            <button class="btn-outline lg" type="button" onClick=${resumeRun}>
              Resume — turn ${state.run.turnNo} of 13
              <span style="font-family:var(--t-fb);font-weight:400;font-size:12px;color:var(--t-dim)">
                ${cap(state.run.difficulty)} · ${cap(state.run.timing)} · ${state.run.seed}
              </span>
            </button>
          `}
          <button class="btn-ghost lg" type="button" onClick=${goPlay}>Play a Seed</button>
        </section>

        <section class="grid g-232">
          <div class="panel stat-card">
            <div class="stat-kicker">Personal best</div>
            <div class="stat-figure">${best ? best.score : '—'}</div>
            <div class="stat-meta">
              ${best
                ? `${cap(best.difficulty)} · ${cap(best.timing)} · ${formatDate(best.date)}`
                : 'No completed runs yet'}
            </div>
          </div>
          <div class="panel stat-card">
            <div class="stat-kicker">Games played</div>
            <div class="stat-figure plain">${standardRuns.length}</div>
            <div class="stat-meta">Upper bonus earned ${bonusRate}%</div>
          </div>
          <div class="panel stat-card">
            <div class="stat-kicker">Best banked word</div>
            <div class="stat-word">${bestWord && bestWord.bestWord ? bestWord.bestWord : '—'}</div>
            <div class="stat-meta">
              ${bestWord && bestWord.bestWord
                ? `${bestWord.bestWordValue} tile value`
                : 'Bank a word to see it here'}
            </div>
          </div>
        </section>

        <section class="grid g-300" aria-label="Coming soon">
          <div class="soon-card">
            <div class="soon-head">
              <h3>Daily Challenge</h3>
              <span class="badge-soon">Coming soon</span>
            </div>
            <p class="soon-body">
              Everyone plays the same daily letters, whenever they like, and compares scores on one
              board.
            </p>
            <div class="soon-tiles" aria-hidden="true">
              ${['T', 'O', 'D', 'A', 'Y', '?'].map((c) => html`<span key=${c}>${c}</span>`)}
            </div>
          </div>
          <div class="soon-card">
            <div class="soon-head">
              <h3>Multiplayer</h3>
              <span class="badge-soon">Coming soon</span>
            </div>
            <p class="soon-body">
              Identical letters and identical replacement luck. Everyone solves alone, then results
              are revealed together.
            </p>
            <div class="soon-meta">
              <span>Same seed</span><span>·</span><span>Independent racks</span><span>·</span>
              <span>Round reveal</span>
            </div>
          </div>
        </section>

        <section class="row" style="gap:8px">
          <button class="pill" type="button" onClick=${() => go('leaderboards')}>Leaderboards</button>
          <button class="pill" type="button" onClick=${() => go('howto')}>How to Play</button>
          <button class="pill" type="button" onClick=${() => go('settings')}>Settings</button>
        </section>

        <div class="foot-note">
          Prototype build · ruleset ${ruleset.rulesetVersion} · scores are stored locally
        </div>
      </div>
    </main>
  `;
}

export function formatDate(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
