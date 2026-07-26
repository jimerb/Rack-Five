// Contextual help. PRD §18.3 asks for small help access beside the budget line,
// the refresh control, word-slot status, the Word Bank, Jumbo, the rank display
// and the scorecard — explaining the rule without leaving the active game.

import { html } from './html.js';
import { showHelp, hideHelp, showTip, hideTip } from '../state/store.js';

export const HELP = {
  budget: {
    title: 'The letter budget',
    body:
      'Every turn gives you a fixed number of letters, and the count includes letters already used in words. Refreshes churn the loose pile only — they never hand you extra letters, and letters inside a word are never replaced.',
    equation: 'loose + placed = your turn budget'
  },
  refresh: {
    title: 'Refreshing',
    body:
      'Two refreshes a turn, each replacing up to 10 loose tiles. Refreshing is the commitment point: every word you have placed becomes permanent, its letters can no longer be reclaimed, and blank assignments are fixed. Placing a word costs you nothing — pulling the trigger on a refresh does.'
  },
  rank: {
    title: 'Length becomes rank',
    body:
      'A word’s length is its rank, and rank plays exactly like a die face. Three of a kind is three words of equal length; a large straight is five words of consecutive lengths. The app always shows the rank, so you never convert in your head.',
    equation: '3→1  4→2  5→3  6→4  7→5  8+→6'
  },
  scorecard: {
    title: 'The scorecard',
    body:
      'Thirteen categories, one per turn. Every open category shows what this hand would score right now. Tapping a row only selects it — you confirm separately, because scoring is final and ends the turn. Any open category can be taken at any time, so a stuck hand is never a dead end: empty slots simply score rank 0.'
  },
  wordBank: {
    title: 'Word Bank',
    body:
      'Only the highest tile-value word in each hand is banked, so concentrate your good letters into one showcase word and let the other four do pattern work. Blanks are worth 0. Hints are paid for out of this bank, which can never go below zero.'
  },
  jumbo: {
    title: 'Jumbo',
    body:
      'The first word of 9 or more letters you play all game earns three points per letter, once. Nine letters pays 27, thirteen pays 39. It occupies no scorecard category and needs no particular turn.'
  },
  slots: {
    title: 'Provisional and permanent',
    body:
      'A word you place is provisional — dismantle it, rearrange it, reclaim its letters, change a blank, all with no penalty. It becomes permanent the moment you refresh or score. Dashed border and a pencil means provisional; a solid border and a padlock means permanent.'
  },
  seed: {
    title: 'Seeds',
    body:
      'A run is defined by its seed and difficulty, so the same code always deals the same racks and the same replacement luck. Share a code and someone else plays your exact letters — which is also how the Daily Challenge will work.'
  },
  hint: {
    title: 'Hints',
    body:
      'A hint costs points off your Word Bank and reveals one valid word of a length you choose, built from your current loose tiles. It makes no promise that the word is the best use of them, or that the rest of the hand still works.'
  },
  timer: {
    title: 'The clock',
    body:
      'Standard gives three minutes a turn, Blitz ninety seconds, Relaxed is untimed. At the buzzer your placed words are safe and become permanent, and any empty slot scores rank 0. The clock stops while you are on another screen.'
  }
};

export function HelpDot({ topic, label }) {
  return html`
    <button
      class="help-dot"
      type="button"
      aria-label=${label || 'What is this?'}
      onClick=${(e) => {
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        showHelp(topic, { x: r.left + r.width / 2, y: r.bottom + 8 });
      }}
    >
      ?
    </button>
  `;
}

/**
 * Props to spread onto anything that should explain itself on hover.
 *
 * `item` is { title, body?, lines?: [[label, value]], note? }. Pass null to opt
 * out — callers often build the item conditionally. Focus and blur are wired
 * alongside the mouse so the same explanation is reachable from the keyboard.
 *
 * The tooltip renders at the app root with fixed positioning, which is what
 * makes it usable on the scorecard: those rows live inside a scroll container
 * that would clip an absolutely-positioned bubble.
 */
export function tipProps(item) {
  if (!item) return {};
  const open = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    showTip(item, { x: r.left + r.width / 2, y: r.bottom + 8, top: r.top });
  };
  return {
    onMouseEnter: open,
    onFocus: open,
    onMouseLeave: hideTip,
    onBlur: hideTip
  };
}

export function HoverTip({ tip }) {
  if (!tip) return null;
  const { item, anchor } = tip;
  const width = 300;
  const left = Math.max(12, Math.min(anchor.x - width / 2, window.innerWidth - width - 12));
  // Flip above the anchor when there is no room below it, and clamp either way
  // so the bubble can never land off-screen.
  const below = anchor.y + 150 < window.innerHeight;
  const style = below
    ? `left:${left}px;top:${Math.max(12, anchor.y)}px`
    : `left:${left}px;bottom:${Math.max(12, window.innerHeight - anchor.top + 8)}px`;
  return html`
    <div class="hover-tip" role="tooltip" style=${style}>
      <h5>${item.title}</h5>
      ${item.body && html`<p>${item.body}</p>`}
      ${item.lines &&
      html`<dl>
        ${item.lines.map(
          ([label, value], i) => html`
            <div key=${i}>
              <dt>${label}</dt>
              <dd class="tnum">${value}</dd>
            </div>
          `
        )}
      </dl>`}
      ${item.note && html`<p class="note">${item.note}</p>`}
    </div>
  `;
}

export function HelpPopover({ tip }) {
  if (!tip) return null;
  const item = HELP[tip.key];
  if (!item) return null;
  const width = 320;
  const left = Math.max(12, Math.min(tip.anchor.x - width / 2, window.innerWidth - width - 12));
  const top = Math.min(tip.anchor.y, window.innerHeight - 180);
  return html`
    <div
      class="help-pop"
      role="dialog"
      aria-label=${item.title}
      style=${`left:${left}px;top:${top}px`}
      onClick=${(e) => e.stopPropagation()}
    >
      <h4>${item.title}</h4>
      <p>${item.body}</p>
      ${item.equation && html`<div class="eq">${item.equation}</div>`}
      <div style="margin-top:10px;display:flex;justify-content:flex-end">
        <button class="link-action" type="button" onClick=${hideHelp}>Close</button>
      </div>
    </div>
  `;
}
