import { useEffect, useLayoutEffect } from 'preact/hooks';
import { html, cx } from '../html.js';
import {
  tapLoose,
  tapBuild,
  undoBuild,
  clearBuild,
  placeWord,
  dismantle,
  enterRefresh,
  cancelRefresh,
  askRefresh,
  openHint,
  saveSettings,
  me,
  placedLetterCount,
  looseCount,
  refreshCap,
  hintCost,
  hintsLeft,
  cap
} from '../../state/store.js';
import { previewScores } from '../../state/store.js';
import { CATEGORIES } from '../../engine/categories.js';
import { lengthToRank, rankTable } from '../../engine/rank.js';
import { Scorecard } from '../game/Scorecard.js';
import { startBuildDrag, startLooseDrag } from '../game/drag.js';
import { fitRack, observeRack, resetRackFit } from '../game/fitRack.js';
import { HelpDot, tipProps } from '../Help.js';
import { formatClock } from './Setup.js';

export function Game({ state }) {
  const run = state.run;
  const turn = state.turn;

  // Size the rack to the space it has. Before paint rather than after, so a
  // freshly dealt rack is never shown at the wrong size for a frame. Runs on
  // every render because the right tile size depends on how many tiles are left,
  // and fitRack returns early when nothing it measures has moved.
  useLayoutEffect(() => {
    fitRack();
  });

  // Viewport changes — resize, browser zoom, pinch, a rotated phone — arrive
  // outside the render cycle and need their own subscription.
  useEffect(() => {
    const stop = observeRack();
    return () => {
      stop();
      resetRackFit();
    };
  }, []);

  // Keyboard play: type letters to build, Enter to place, Backspace to undo.
  useEffect(() => {
    const onKey = (e) => {
      if (!run || !turn || turn.expired || state.modal) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        placeWord();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        undoBuild();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearBuild();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const letter = e.key.toUpperCase();
        const tile =
          turn.loose.find((t) => !t.blank && t.letter === letter) ||
          (e.shiftKey ? turn.loose.find((t) => t.blank) : null);
        if (tile) {
          e.preventDefault();
          tapLoose(tile.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, turn, state.modal]);

  if (!run || !turn) return html`<main class="screen"><div class="screen-col w-940" /></main>`;

  const ruleset = run.ruleset;
  const player = me(run);
  const placed = placedLetterCount(turn);
  const loose = looseCount(turn);
  const anyPermanent = turn.slots.some((s) => s && !s.provisional);
  const filled = turn.slots.filter(Boolean);
  const bankCandidate = filled.reduce((a, s) => (!a || s.tileValue > a.tileValue ? s : a), null);
  const refreshing = turn.mode === 'refresh';
  const cap10 = refreshCap();

  const sorted = sortTiles(turn.loose, state.settings.sort);
  const buildWord = turn.build.map((t) => t.letter || '·').join('');
  const buildValue = turn.build.reduce((a, t) => a + (t.blank ? 0 : t.value), 0);
  const buildRank = lengthToRank(ruleset, turn.build.length);

  const warnAt = ruleset.timingSeconds.warningThreshold;
  const lowTime = turn.secondsLeft !== null && turn.secondsLeft <= warnAt;

  return html`
    <main class="game">
      <header class="hud">
        <span class="hud-diff" ...${tipProps(difficultyTip(run, ruleset))}>
          ${cap(run.difficulty)}
        </span>
        <span class="hud-turn">
          Turn <strong>${run.turnNo}</strong> / ${ruleset.gameLength.full}
        </span>

        <span class="hud-budget">
          <span class="label-cap">Budget</span>
          <${HelpDot} topic="budget" label="How the letter budget works" />
          <strong class="tnum">${loose}</strong><span class="muted">loose</span>
          <span class="op">+</span>
          <strong class="tnum">${placed}</strong>
          <span class="muted">${anyPermanent ? 'permanent' : 'placed'}</span>
          <span class="op">=</span>
          <strong class="total tnum">${run.budget}</strong>
        </span>
        <span class="budget-bar" aria-hidden="true">
          <span class="seg-placed" style=${`width:${(placed / run.budget) * 100}%`}></span>
          <span class="seg-loose" style=${`width:${(loose / run.budget) * 100}%`}></span>
        </span>

        <span class="hud-group">
          <span class="label-cap">Refresh</span>
          <${HelpDot} topic="refresh" label="What refreshing does" />
          <span class="refresh-dots" aria-hidden="true">
            ${Array.from({ length: ruleset.refresh.count }, (_, i) => html`
              <span key=${i} class=${i < turn.refreshesLeft ? 'left' : 'spent'}></span>
            `)}
          </span>
          <span style="font-size:12px;color:var(--t-muted)">
            ${turn.refreshesLeft} left · up to ${cap10} tiles
          </span>
        </span>

        <span class="hud-group baseline">
          <span class="label-cap">Bank</span>
          <${HelpDot} topic="wordBank" label="How the Word Bank works" />
          <strong class="hud-value">${player.wordBank}</strong>
        </span>

        <span class="hud-group baseline">
          <span class="label-cap">Jumbo</span>
          <${HelpDot} topic="jumbo" label="How Jumbo works" />
          <span style="font-size:12px;color:var(--t-muted)">
            ${player.jumboClaimed
              ? `${player.jumboWord} +${player.jumboPoints}`
              : `Open · ${ruleset.jumbo.minimumLength}+ letters`}
          </span>
        </span>

        <span class="hud-clock-wrap">
          <${HelpDot} topic="timer" label="How the clock works" />
          <span class="label-cap">${run.timing === 'relaxed' ? 'Untimed' : cap(run.timing)}</span>
          <span
            class=${cx('hud-clock', lowTime && 'is-low', lowTime && turn.secondsLeft > 0 && 'pulse')}
            role="timer"
            aria-live="off"
          >
            ${turn.secondsLeft === null ? '—:—' : formatClock(turn.secondsLeft)}
          </span>
        </span>
      </header>

      <div class="game-main">
        <div class="play-col">
          <section class="rack-panel">
            <div class="rack-head">
              <span class="row-tight" style="flex-wrap:wrap">
                <span class="rack-title">Loose rack</span>
                ${refreshing &&
                html`
                  <span class="rack-select-note">
                    Tap tiles to discard — ${turn.refreshSel.length} of ${cap10} selected
                  </span>
                `}
                ${turn.powerSwapAvailable &&
                html`<span class="rack-select-note">Power Letters — tap a tile to swap it free</span>`}
              </span>

              <!-- Lives in the rack header rather than in its own strip below the
                   rack: it is reference information, and a full-width band of it
                   pushed the build bar and word slots down the page. -->
              <span class="rank-inline">
                <span class="label-cap" style="white-space:nowrap">Length becomes rank</span>
                <${HelpDot} topic="rank" label="How length becomes rank" />
                <span class="chips">
                  ${rankTable(ruleset).map(
                    (r) => html`
                      <span
                        key=${r.rank}
                        class=${cx(
                          'rank-chip',
                          buildRank === r.rank && turn.build.length >= 3 && 'is-live'
                        )}
                      >
                        <span class="l">L${r.length}</span>
                        <span class="r">${r.rank}</span>
                      </span>
                    `
                  )}
                </span>
              </span>

              <span class="segmented" role="group" aria-label="Sort the rack">
                ${[
                  ['draw', 'Draw'],
                  ['az', 'A–Z'],
                  ['value', 'Value']
                ].map(
                  ([key, label]) => html`
                    <button
                      key=${key}
                      type="button"
                      class=${cx(state.settings.sort === key && 'is-on')}
                      aria-pressed=${state.settings.sort === key}
                      onClick=${() => saveSettings({ sort: key })}
                    >
                      ${label}
                    </button>
                  `
                )}
              </span>
            </div>

            <div class="rack-grid">
              ${sorted.map((tile) => {
                const marked = refreshing && turn.refreshSel.includes(tile.id);
                return html`
                  <button
                    key=${tile.id}
                    type="button"
                    data-li=${tile.id}
                    class=${cx('tile', marked && 'is-marked', tile.blank && 'is-blank', tile.red && 'is-red')}
                    disabled=${turn.expired}
                    onPointerDown=${(e) => !turn.expired && startLooseDrag(e, tile.id)}
                    onClick=${() => tapLoose(tile.id)}
                    aria-label=${tileLabel(tile, marked, refreshing)}
                  >
                    <span class="tl">${tile.blank ? '' : tile.letter}</span>
                    <span class="tv">${tile.blank ? '' : tile.value}</span>
                  </button>
                `;
              })}
              ${!sorted.length && html`<div class="rack-empty">Every loose tile is in play.</div>`}
            </div>
          </section>

          <section class="build-bar" data-dropzone="build" aria-label="Build bar">
            <div class="build-tiles">
              ${turn.build.map(
                (tile, i) => html`
                  <button
                    key=${tile.id}
                    type="button"
                    data-bi=${i}
                    class=${cx('build-tile', tile.blank && 'is-blank', tile.red && 'is-red')}
                    onPointerDown=${(e) => startBuildDrag(e, i, tile.id)}
                    onClick=${() => tapBuild(tile.id)}
                    aria-label=${`${tile.red ? 'Red tile, ' : ''}${tile.blank ? 'Blank as ' : ''}${tile.letter || 'unassigned blank'}, position ${i + 1}. Activate to return it to the rack.`}
                  >
                    <span class="tl">${tile.letter || '?'}</span>
                    <span class="tv">${tile.blank ? 0 : tile.value}</span>
                  </button>
                `
              )}
              ${!turn.build.length &&
              html`<span class="build-hint">Tap letters in the rack to build a word here.</span>`}
            </div>

            <div class="build-readout">
              <div class="build-word">${buildWord}</div>
              <div class="build-meta">
                ${turn.build.length} letters →${' '}
                <span class="rank">rank ${buildRank}</span> · tile value ${buildValue}
              </div>
              ${turn.build.length > 1 &&
              html`<div class="build-tip">
                Drag a tile sideways to reorder · tap it to send it back to the rack.
              </div>`}
            </div>

            <button class="btn-ghost" type="button" style="min-height:44px" onClick=${undoBuild}>
              Undo
            </button>
            <button class="btn" type="button" onClick=${placeWord}>Place word</button>
          </section>

          ${turn.expired &&
          html`
            <div class="banner" role="status">
              <b>Turn over</b>
              <span>
                Tiles are locked and empty slots score rank 0. Choose one category on the scorecard
                to finish the turn.
              </span>
            </div>
          `}
          ${turn.error &&
          html`
            <div class="banner" role="alert">
              <b>Can’t place that</b>
              <span>${turn.error}</span>
            </div>
          `}

          <section class="slots" aria-label="Word slots">
            ${turn.slots.map((slot, i) => {
              const isMoney = !!slot && !!bankCandidate && slot.word === bankCandidate.word;
              return html`
                <button
                  key=${i}
                  type="button"
                  class=${cx(
                    'slot',
                    !slot && 'is-empty',
                    slot && slot.provisional && 'is-provisional',
                    slot && !slot.provisional && 'is-permanent'
                  )}
                  disabled=${!slot || !slot.provisional || turn.expired}
                  onClick=${() => dismantle(i)}
                  aria-label=${slotLabel(slot, i)}
                >
                  <span class="slot-head">
                    <span class="slot-n">Slot ${i + 1}</span>
                    ${isMoney && html`<span class="slot-money">Money word</span>`}
                    ${i === 0 && html`<span class="spacer"><${HelpDot} topic="slots" label="Provisional and permanent" /></span>`}
                  </span>
                  ${slot
                    ? html`
                        <span class="slot-letters">
                          ${slot.letters.map(
                            (L, j) =>
                              html`<span key=${j} class=${cx(L.blank && 'blank', L.red && 'is-red')}>${L.c}</span>`
                          )}
                        </span>
                        <span class="slot-figures">
                          <span class="slot-rank">${slot.rank}</span>
                          <span class="slot-cap">rank</span>
                          <span class="slot-tv">${slot.tileValue}</span>
                          <span class="slot-cap">tile</span>
                        </span>
                      `
                    : html`<span class="slot-empty">Empty</span>`}
                  <span class="slot-status">
                    ${slot
                      ? slot.provisional
                        ? '✎ Provisional · tap to edit'
                        : '🔒 Permanent'
                      : 'Empty → scores rank 0'}
                  </span>
                </button>
              `;
            })}
          </section>

          <div class="progress-strip">
            <span class="row-tight" style="white-space:nowrap">
              <span class="progress-count">${filled.length} of 5</span>
              <span class="label-cap">words placed</span>
            </span>
            <span class="progress-next">${nextStep(turn, filled.length)}</span>
          </div>
        </div>

        <div class="card-col">
          <div class="action-row">
            ${refreshing
              ? html`
                  <button
                    class="btn"
                    type="button"
                    disabled=${!turn.refreshSel.length}
                    onClick=${askRefresh}
                  >
                    Refresh ${turn.refreshSel.length} tile${turn.refreshSel.length === 1 ? '' : 's'}
                  </button>
                  <button class="btn-ghost" type="button" onClick=${cancelRefresh}>Cancel</button>
                `
              : turn.refreshesLeft > 0 && !turn.expired
                ? html`
                    <button
                      class="btn-outline"
                      type="button"
                      ...${tipProps(refreshTip(turn, cap10, filled.length))}
                      onClick=${enterRefresh}
                    >
                      Refresh loose tiles
                    </button>
                  `
                : html`
                    <button class="btn-ghost" type="button" disabled>
                      ${turn.expired ? 'Time is up — no more refreshes' : 'No refreshes left this turn'}
                    </button>
                  `}
            <span ...${tipProps(hintTip(player, ruleset))}>
              <button
                class="btn-ghost"
                type="button"
                disabled=${turn.expired || hintsLeft() <= 0}
                onClick=${openHint}
              >
                Hint · costs ${hintCost()} · ${hintsLeft()} left
              </button>
            </span>
          </div>

          <${Scorecard} state=${state} />
        </div>
      </div>

      <!-- Narrow screens only. The scorecard is a core part of the game, so it
           must never be more than one tap away even when the columns stack. -->
      <div class="jump-bar" role="group" aria-label="Jump between the board and the scorecard">
        <button type="button" onClick=${() => scrollTo('.play-col')}>Board</button>
        <button type="button" onClick=${() => scrollTo('.card-col')}>
          Scorecard · ${bestOpen(state)}
        </button>
      </div>
    </main>
  `;
}

/* ── Hover explanations ──────────────────────────────────────────────────────
   Each of these answers the question the control actually raises: what does
   this cost me, what does it commit me to, and what changes if I use it. */

function difficultyTip(run, ruleset) {
  const d = ruleset.difficulty[run.difficulty];
  return {
    title: `${cap(run.difficulty)} · ${run.budget} letters`,
    body: `${d.blurb}. Difficulty changes one thing only — how many letters you get each turn. It adds no penalties and locks no categories.`,
    lines: [
      ['Letters per turn', run.budget],
      ['Refreshes', `${ruleset.refresh.count} × up to ${ruleset.refresh.maximumTiles}`],
      ['Upper bonus at', d.upperBonusThreshold]
    ],
    note:
      run.budget < 40
        ? 'Every category is still reachable, but a rank-6 Rack Five needs 40 letters and cannot be built here.'
        : null
  };
}

function refreshTip(turn, cap, placedWords) {
  return {
    title: 'Refresh loose tiles',
    body: `Swap up to ${cap} loose tiles for new ones. Your budget does not change, and letters already inside a word are never replaced.`,
    lines: [
      ['Refreshes left', turn.refreshesLeft],
      ['Tiles you may swap', `up to ${cap}`],
      ['Words this would lock', placedWords]
    ],
    note: placedWords
      ? 'This is the commitment point: every word you have placed becomes permanent, its letters cannot be reclaimed, and blanks are fixed.'
      : 'Nothing is placed yet, so there is nothing to lock in — refreshing now costs you only the refresh.'
  };
}

function hintTip(player, ruleset) {
  const cost = ruleset.wordBank.hintCost;
  const left = ruleset.wordBank.maximumHints - player.hintsUsed;
  return {
    title: 'Hint',
    body: 'Reveals one valid word of a length you choose, built from the tiles loose right now. It is one word that fits, not the best word, and it makes no promise the other four slots still work.',
    lines: [
      ['Cost', `${cost} off the Word Bank`],
      ['Your Word Bank', player.wordBank],
      ['Hints left', left]
    ],
    note:
      left <= 0
        ? 'No hints left this game.'
        : player.wordBank < cost
          ? 'Your bank is too low — bank a word first. It can never go negative.'
          : 'Paid once, at purchase. Scoring never charges you again.'
  };
}

function scrollTo(selector) {
  const el = document.querySelector(selector);
  const container = document.querySelector('.game-main');
  if (!el || !container) return;
  const top =
    el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  const smooth =
    !document.documentElement.classList.contains('reduce-motion') &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!smooth) {
    container.scrollTop = top;
    return;
  }
  container.scrollTo({ top, behavior: 'smooth' });
  // Some engines ignore smooth scrolling on a nested flex scroller. Land it anyway.
  setTimeout(() => {
    if (Math.abs(container.scrollTop - top) > 4) container.scrollTop = top;
  }, 260);
}

/** The best-scoring open category right now, for the narrow-screen jump button. */
function bestOpen(state) {
  const preview = previewScores();
  const player = me(state.run);
  let best = null;
  for (const c of CATEGORIES) {
    if (player.card[c.key] !== null) continue;
    const v = preview[c.key] || 0;
    if (!best || v > best.v) best = { name: c.name, v };
  }
  return best ? `${best.name} +${best.v}` : 'complete';
}

function sortTiles(tiles, mode) {
  const list = tiles.slice();
  if (mode === 'az') {
    list.sort((a, b) => (a.blank ? 1 : b.blank ? -1 : a.letter.localeCompare(b.letter)));
  } else if (mode === 'value') {
    list.sort((a, b) => b.value - a.value || (a.letter || '').localeCompare(b.letter || ''));
  }
  return list;
}

function tileLabel(tile, marked, refreshing) {
  const base = tile.blank ? 'Blank tile, worth 0' : `${tile.letter}, worth ${tile.value}`;
  const name = tile.red ? `Red tile, ${base}` : base;
  if (refreshing) return `${name}. ${marked ? 'Selected to discard' : 'Tap to select for discard'}`;
  return `${name}. Tap to add it to the build bar.`;
}

function slotLabel(slot, i) {
  if (!slot) return `Slot ${i + 1} is empty and would score rank 0.`;
  const red = slot.letters.find((L) => L.red);
  return (
    `Slot ${i + 1}: ${slot.word}, ${slot.word.length} letters, rank ${slot.rank}, tile value ${slot.tileValue}. ` +
    (red ? `The ${red.c} is a red tile. ` : '') +
    (slot.provisional ? 'Provisional — activate to dismantle it.' : 'Permanent.')
  );
}

function nextStep(turn, filledCount) {
  if (turn.slots.every(Boolean)) {
    return 'All five words are in. Now choose one scorecard category to bank this hand.';
  }
  if (turn.expired) return 'Time is up. Choose one category to close the turn.';
  const left = 5 - filledCount;
  if (turn.refreshesLeft === 0) {
    return `No refreshes left — keep building, or finish now and let ${left} empty slot${
      left === 1 ? '' : 's'
    } score rank 0.`;
  }
  return `Keep building — ${left} slot${left === 1 ? '' : 's'} to go. Or refresh, or take any open category now and let the empty slots score rank 0.`;
}
