import { html } from './html.js';
import {
  closeModal,
  cancelRefresh,
  confirmRefresh,
  assignBlank,
  buyHint,
  advance,
  recordIntent,
  recordFeeling,
  discardRunAndSetUp,
  abandonRun,
  resumeRun,
  currentRanks,
  totals,
  me,
  hintCost,
  categoryName,
  setNameDraft,
  submitLeaderboardEntry,
  skipLeaderboardEntry
} from '../state/store.js';
import { CATEGORIES } from '../engine/categories.js';
import { lengthToRank } from '../engine/rank.js';

const FEELINGS = ['Obvious', 'Tense', 'Lucky', 'Clever', 'Frustrating'];

export function Modals({ state }) {
  const modal = state.modal;
  if (!modal) return null;
  const run = state.run;
  const turn = state.turn;

  const body = () => {
    switch (modal.type) {
      case 'refresh':
        return refreshModal(state);
      case 'blank':
        return blankModal();
      case 'hint':
        return hintModal(state);
      case 'hint-result':
        return hintResultModal(state);
      case 'jumbo':
        return jumboModal(state);
      case 'turn-summary':
        return summaryModal(state);
      case 'timeout':
        return timeoutModal(state);
      case 'run-in-progress':
        return runInProgressModal(state);
      case 'abandon-run':
        return abandonRunModal(state);
      case 'intent':
        return intentModal(state, modal.post);
      case 'declare':
        return declareModal(state);
      case 'feeling':
        return feelingModal();
      case 'name-entry':
        return nameEntryModal(state);
      default:
        return null;
    }
  };

  if (!run && modal.type !== 'run-in-progress') return null;
  if (!turn && ['refresh', 'blank', 'hint', 'timeout', 'intent', 'declare'].includes(modal.type)) {
    return null;
  }

  return html`<div class="modal-backdrop" role="dialog" aria-modal="true">${body()}</div>`;
}

function refreshModal(state) {
  const n = state.turn.refreshSel.length;
  const provisional = state.turn.slots.filter((s) => s && s.provisional).length;
  return html`
    <div class="modal">
      <h2 class="modal-title">This step is irreversible</h2>
      <p class="body-15">
        Refreshing will replace <strong>${n} loose tile${n === 1 ? '' : 's'}</strong> — and it makes${' '}
        <strong>every word you have placed permanent</strong>. Permanent words can’t be dismantled,
        their letters can’t be reclaimed, and blank assignments are fixed.
      </p>
      ${provisional > 0 &&
      html`<p class="body-13" style="margin:0">
        ${provisional} provisional word${provisional === 1 ? '' : 's'} will be locked in:${' '}
        ${state.turn.slots.filter((s) => s && s.provisional).map((s) => s.word).join(', ')}.
      </p>`}
      <div class="reassure">
        Your budget does not change. Letters already used in words are never replaced.
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" type="button" onClick=${cancelRefresh}>Keep rearranging</button>
        <button class="btn" type="button" onClick=${confirmRefresh}>
          Replace ${n} tile${n === 1 ? '' : 's'} & commit
        </button>
      </div>
    </div>
  `;
}

function blankModal() {
  return html`
    <div class="modal blank-modal">
      <h2 class="modal-title" style="color:var(--t-text)">What is this blank?</h2>
      <p class="body-14" style="margin:0">
        A blank counts as one letter toward length and is worth 0 tile value. You can change it while
        the word is still provisional.
      </p>
      <div class="blank-grid">
        ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(
          (L) => html`<button key=${L} type="button" onClick=${() => assignBlank(L)}>${L}</button>`
        )}
      </div>
    </div>
  `;
}

function hintModal(state) {
  const ruleset = state.run.ruleset;
  const max = ruleset.wordBank.maximumHints;
  return html`
    <div class="modal">
      <h2 class="modal-title" style="color:var(--t-text)">Buy a hint</h2>
      <p class="body-14" style="margin:0">
        Costs ${hintCost()} points off your Word Bank and reveals one valid word of the length you
        pick, built from your current loose tiles. It makes no promise about the other four slots.${' '}
        ${max === 1 ? 'One hint per game' : max + ' hints per game'}.
      </p>
      <div class="hint-grid">
        ${[3, 4, 5, 6, 7, 8].map(
          (n) => html`
            <button key=${n} type="button" onClick=${() => buyHint(n)}>
              <span class="n">${n}</span>
              <span class="r">rank ${lengthToRank(ruleset, n)}</span>
            </button>
          `
        )}
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" type="button" onClick=${closeModal}>Never mind</button>
      </div>
    </div>
  `;
}

function hintResultModal(state) {
  const word = state.turn.hintWord;
  const player = me(state.run);
  return html`
    <div class="modal" style="width:min(480px,100%)">
      <div class="kicker-sm">Hint · ${hintCost()} points spent</div>
      ${word
        ? html`<div class="hint-word">${word}</div>`
        : html`<p class="body-15" style="margin:0">${state.turn.hintReason}</p>`}
      <p class="body-13" style="margin:0">
        Your Word Bank is now ${player.wordBank}.
        ${word
          ? ' This word is reachable from your loose tiles, but it may not be the best use of them.'
          : ''}
      </p>
      <div class="modal-actions">
        <button class="btn" type="button" onClick=${closeModal}>Got it</button>
      </div>
    </div>
  `;
}

function jumboModal(state) {
  const player = me(state.run);
  const jumbo = state.run.ruleset.jumbo;
  return html`
    <div class="modal jumbo-modal">
      <div class="jumbo-kicker">Once per game</div>
      <div class="jumbo-word-big">JUMBO</div>
      <div class="display" style="font-size:26px;letter-spacing:.1em">${player.jumboWord}</div>
      <p class="body-15 muted" style="margin:0">
        ${player.jumboWord.length} letters at ${jumbo.pointsPerLetter} points each —${' '}
        <strong style="color:var(--t-acc-hi)">+${player.jumboPoints}</strong> added outside the
        scorecard.
      </p>
      <button class="btn lg" type="button" onClick=${advance}>Nice — keep going</button>
    </div>
  `;
}

function summaryModal(state) {
  const run = state.run;
  const player = me(run);
  const last = run.history[run.history.length - 1];
  const t = totals(run);
  if (!last) return null;
  return html`
    <div class="modal">
      <div class="kicker-sm">Turn scored</div>
      <div class="display" style="font-size:28px;line-height:1.1">
        ${categoryName(last.category)} <span class="accent">+${last.categoryPoints}</span>
      </div>
      <p class="body-14" style="margin:0">${last.resultLine}</p>
      <div class="summary-block">
        <div class="line">
          <span class="muted">Banked word</span>
          <strong class="display" style="letter-spacing:.06em">${last.bankedWord || '—'}</strong>
          <span class="accent" style="font-weight:700">+${last.bankedWordValue}</span>
        </div>
        <div class="line"><span class="muted">Word Bank now</span><strong>${player.wordBank}</strong></div>
        <div class="line">
          <span class="muted">Running total</span><strong class="accent">${t.total}</strong>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn" type="button" onClick=${advance}>
          ${run.history.length >= 13 ? 'See results' : 'Next turn'}
        </button>
      </div>
    </div>
  `;
}

function timeoutModal(state) {
  return html`
    <div class="modal timeout-modal">
      <h2 class="modal-title">Time’s up</h2>
      <p class="body-15">
        Your placed words are safe and now permanent. Any empty slot becomes${' '}
        <strong>rank 0</strong> — a rank 0 adds nothing and can’t join a set, a full house or a
        straight.
      </p>
      <p class="body-14" style="margin:0">Ranks this hand: ${currentRanks().join(' · ')}</p>
      <div class="modal-actions">
        <button class="btn" type="button" onClick=${closeModal}>Choose a category</button>
      </div>
    </div>
  `;
}

function runInProgressModal(state) {
  const run = state.run;
  return html`
    <div class="modal">
      <h2 class="modal-title">You have a run in progress</h2>
      <p class="body-15">
        ${run
          ? `Turn ${run.turnNo} of 13 · ${run.seed}. Starting a new run discards it — only one unfinished run is kept.`
          : ''}
      </p>
      <div class="modal-actions">
        <button class="btn-ghost" type="button" onClick=${discardRunAndSetUp}>
          Discard and start new
        </button>
        <button class="btn" type="button" onClick=${() => { closeModal(); resumeRun(); }}>
          Back to my run
        </button>
      </div>
    </div>
  `;
}

function abandonRunModal(state) {
  const run = state.run;
  return html`
    <div class="modal">
      <h2 class="modal-title">Abandon this run?</h2>
      <p class="body-15">
        ${run ? `Turn ${run.turnNo} of 13 · ${run.seed}. ` : ''}This ends the run for good — its
        scorecard, Word Bank and progress are all lost and cannot be recovered.
      </p>
      <div class="modal-actions">
        <button class="btn-ghost" type="button" onClick=${abandonRun}>Abandon run</button>
        <button class="btn" type="button" onClick=${closeModal}>Keep playing</button>
      </div>
    </div>
  `;
}

function intentModal(state, post) {
  const player = me(state.run);
  const open = CATEGORIES.filter((c) => player.card[c.key] === null);
  return html`
    <div class="modal" style="width:min(620px,100%)">
      <div class="kicker-sm">Playtest instrumentation</div>
      <h2 class="modal-title" style="color:var(--t-text)">
        ${post ? 'What category are you considering now?' : 'What category are you aiming for right now?'}
      </h2>
      <p class="body-14" style="margin:0">
        This does not lock your choice. It helps us understand how the game unfolds.
      </p>
      <div class="intent-grid">
        ${open.map(
          (c) => html`
            <button key=${c.key} type="button" onClick=${() => recordIntent(c.key, post)}>
              <span class="n">${c.name}</span>
              <span class="h">${c.hint}</span>
            </button>
          `
        )}
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" type="button" onClick=${() => recordIntent(null, post)}>
          Not sure yet
        </button>
      </div>
    </div>
  `;
}

function declareModal(state) {
  const player = me(state.run);
  const open = CATEGORIES.filter((c) => player.card[c.key] === null);
  return html`
    <div class="modal" style="width:min(620px,100%)">
      <div class="kicker-sm">Experimental variant · Blind Declaration</div>
      <h2 class="modal-title" style="color:var(--t-text)">Declare your target category</h2>
      <p class="body-14" style="margin:0">
        Name a category before the rack is revealed. It scores at full value; any other category
        scores half, rounded down.
      </p>
      <div class="intent-grid">
        ${open.map(
          (c) => html`
            <button key=${c.key} type="button" onClick=${() => recordIntent(c.key)}>
              <span class="n">${c.name}</span>
              <span class="h">${c.hint}</span>
            </button>
          `
        )}
      </div>
    </div>
  `;
}

function nameEntryModal(state) {
  const pending = state.pendingEntry;
  if (!pending) return null;
  const name = state.nameDraft;
  const submit = () => {
    if (name.trim()) submitLeaderboardEntry();
  };
  return html`
    <div class="modal" style="width:min(420px,100%)">
      <div class="kicker-sm">High score · ${pending.totals.total} points</div>
      <h2 class="modal-title" style="color:var(--t-text)">Enter your name for the leaderboard</h2>
      <p class="body-14" style="margin:0">
        A name, initials — whatever you want other players to see next to this run.
      </p>
      <input
        class="text-input"
        style="margin-top:4px;text-transform:uppercase"
        value=${name}
        maxlength="24"
        placeholder="e.g. TB or Terry B"
        aria-label="Name or initials for the leaderboard"
        autofocus
        onInput=${(e) => setNameDraft(e.target.value)}
        onKeyDown=${(e) => e.key === 'Enter' && submit()}
      />
      <div class="modal-actions">
        <button class="btn-ghost" type="button" onClick=${skipLeaderboardEntry}>Skip</button>
        <button class="btn" type="button" disabled=${!name.trim()} onClick=${submit}>
          Save score
        </button>
      </div>
    </div>
  `;
}

function feelingModal() {
  return html`
    <div class="modal">
      <div class="kicker-sm">Playtest instrumentation</div>
      <h2 class="modal-title" style="color:var(--t-text)">How did that turn feel?</h2>
      <div class="feel-row">
        ${FEELINGS.map(
          (f) => html`
            <button key=${f} class="pill" type="button" onClick=${() => recordFeeling(f.toLowerCase())}>
              ${f}
            </button>
          `
        )}
      </div>
    </div>
  `;
}
