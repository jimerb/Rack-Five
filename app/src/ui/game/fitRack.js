// Sizing the loose rack to the space it actually has.
//
// The rack is a grid of square tracks. Its column count is a step function of
// width and its row count is a step function of the column count, so the height
// it *needs* moves in ~67px jumps while the height it is *allowed*
// (`min(46vh, 340px)` and friends) moves smoothly with the viewport. Nothing
// reconciled the two, so at unlucky widths the last row landed past the cap and
// was sliced in half — a row of headless letters. A 4K monitor at 100% browser
// zoom hit it; at 90% the same screen was fine, which is the tell.
//
// CSS cannot solve it, because it is circular: columns depend on the tile size,
// rows depend on the columns, and the required height depends on the rows. So
// this module does the one thing CSS cannot — search for the largest tile size
// whose whole rack fits — and hands the answer back as `--rack-tile`.
//
// It also owns the rack's height, capping it to a whole number of rows. One
// writer for both numbers: a second writer could disagree with the first, and
// disagreement is exactly what produced the sliced row.
//
// Everything here is a progressive enhancement. Nothing calls it to lay the rack
// out in the first place — the CSS in game.css already produces today's layout on
// its own, and if this module never runs, throws, or is served to a browser
// without ResizeObserver, the rack is exactly what it was before.

import { isDragging } from './drag.js';

// 2px steps rather than 1px: tiles never jitter by a pixel as the rack empties,
// and every boundary gets a little free hysteresis. The search starts at MAX and
// walks down, so the largest sizes — 60, today's desktop value, and 56, today's
// phone value — are always tried first and land exactly on a step. A coarser
// step costs real tile size at the boundaries (at one test viewport a 4px step
// fell all the way to the 48px floor where 50px fits comfortably).
const STEP = 2;
const MAX = 60;
// Growth above the tuned 60px, for displays with room to spare. Gated on the
// rack's own width rather than the viewport's, because that is the thing that
// actually looks empty: at 1920 the rack is ~1470px and lays 45 tiles out in 21
// columns and three rows, which reads as a small board adrift on a big screen.
// The gate is set above the widths the layout was tuned at — a 1280 desktop
// (~817px of rack) and a 1440 one (~992px) are both below it and do not move a
// pixel — so only displays meaningfully larger than that fill out.
const GROW_MAX = 72;
const GROW_MIN_WIDTH = 1100;
// Fingertip size. Above Material's 48dp and Apple's 44pt, and the point below
// which the 10px value in the tile's corner starts crowding the letter.
const MIN = 48;
// The gap between the rack and whatever sits under it, so the fitter does not
// size the rack flush against the build bar.
const SAFETY = 16;

let lastFit = null; // { w, h, n, tile } — the previous accepted fit
let capCache = { key: '', cap: Infinity };
let reserve = { width: -1, height: 0 };

function px(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** The nearest ancestor that actually scrolls. `.play-col` above the stacking
 *  breakpoint, `.game-main` below it — never hardcode either. */
function scrollerFor(el) {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * The rack's top edge measured in layout coordinates, not viewport coordinates.
 *
 * This distinction is the whole ballgame. `getBoundingClientRect().top` would be
 * a function of how far the column happens to be scrolled, which would make the
 * tile size depend on scroll position — and worse, close a loop, because writing
 * a size changes `scrollHeight`, which clamps `scrollTop`, which moves `rect.top`.
 * `offsetTop` is immune: it is where the box sits in the layout, scrolled or not.
 *
 * `.game` is `position: relative`, so it is the `offsetParent` of both the rack
 * and the scroller and their offsets share one coordinate space.
 */
function topWithinScroller(rg, scroller) {
  if (rg.offsetParent === scroller) return rg.offsetTop;
  if (rg.offsetParent && rg.offsetParent === scroller.offsetParent) {
    return rg.offsetTop - scroller.offsetTop;
  }
  return null; // unfamiliar geometry — fall back to the CSS cap alone
}

/**
 * The CSS cap, read without reading our own inline override back.
 *
 * Cached against the viewport because that is the only thing the cap depends on
 * (`vh` units and height/width media queries). The viewport is used purely as a
 * cache key here — never as a measurement, which is what keeps this loop-free.
 */
function cssCap(rg) {
  const key = window.innerWidth + 'x' + window.innerHeight;
  if (capCache.key === key) return capCache.cap;
  const inline = rg.style.maxHeight;
  rg.style.maxHeight = '';
  const cap = parseFloat(getComputedStyle(rg).maxHeight);
  if (inline) rg.style.maxHeight = inline;
  capCache = { key, cap: Number.isFinite(cap) ? cap : Infinity };
  return capCache.cap;
}

/**
 * How much height to keep clear under the rack so the word being built stays on
 * screen.
 *
 * Deliberately reserves the *tile row* and not the whole build bar. On a phone
 * the bar is ~198px because the readout and the Undo/Place buttons wrap under
 * it, and reserving all of that cost the rack 120px — it was showing four rows
 * where it could show six. What the player needs in view is the word itself; the
 * buttons can sit below the fold, one short scroll or one Enter key away.
 *
 * Measured only when the bar is empty, then cached. Its height steps as a word is
 * assembled and the row rewraps, and feeding that back in live would resize the
 * rack while the player is tapping letters into it — the single worst moment to
 * move a tap target. A growing build bar pushes the *slots* down instead, which
 * is the right thing to give up.
 */
function buildReserve(scroller) {
  const bar = document.querySelector('.build-bar');
  if (!bar) return 0;
  const width = scroller ? scroller.clientWidth : window.innerWidth;
  const empty = document.querySelector('.build-tile') === null;
  if (empty || reserve.width !== width) {
    const cs = getComputedStyle(bar);
    const row = bar.querySelector('.build-tiles');
    reserve = {
      width,
      height: (row ? row.offsetHeight : 54) + px(cs.paddingTop) + px(cs.paddingBottom)
    };
  }
  return reserve.height;
}

/**
 * Largest tile size whose entire rack fits, or MIN if none does.
 * Exported so the tests and the console can exercise the arithmetic directly.
 */
export function chooseTile(availableWidth, availableHeight, count, gap, max = MAX) {
  for (let tile = max; tile >= MIN; tile -= STEP) {
    const columns = Math.max(1, Math.floor((availableWidth + gap) / (tile + gap)));
    const rows = Math.ceil(count / columns);
    if (rows * tile + (rows - 1) * gap <= availableHeight) return tile;
  }
  return MIN;
}

/** Size the rack to its space. Safe to call on every render. */
export function fitRack() {
  const rg = document.querySelector('.rack-grid');
  if (!rg) {
    lastFit = null;
    return;
  }
  // Never retile under a held finger: drag.js hit-tests with elementFromPoint,
  // so moving the grid mid-gesture would cascade reorders nobody asked for.
  if (isDragging()) return;

  try {
    const count = rg.querySelectorAll('.tile').length;
    if (!count) {
      clear(rg);
      return;
    }

    const cs = getComputedStyle(rg);
    const gap = px(cs.rowGap) || 7;
    const padX = px(cs.paddingLeft) + px(cs.paddingRight);
    const padY = px(cs.paddingTop) + px(cs.paddingBottom);

    // Width is safe to read straight from the element: `scrollbar-gutter: stable`
    // (game.css) reserves the scrollbar whether or not it is showing, so this
    // number does not lurch when the rack stops overflowing. The extra pixel
    // absorbs the sub-pixel disagreement between this arithmetic and the engine's
    // own track packing at fractional zoom levels — without it, a rounding
    // difference costs a column, which costs a row, which is the original bug.
    const width = rg.clientWidth - padX - 1;
    if (width <= 0) return;

    const scroller = scrollerFor(rg);
    let budget = cssCap(rg);
    if (scroller) {
      const top = topWithinScroller(rg, scroller);
      if (top !== null) {
        const room = scroller.clientHeight - top - buildReserve(scroller) - SAFETY;
        if (room > 0) budget = Math.min(budget, room);
      }
    }
    if (!Number.isFinite(budget)) budget = rg.clientHeight;
    const height = budget - padY;
    if (height <= 0) return;

    // Hold the rack completely still while a word is being assembled. Every tap
    // moves a tile out of the rack, and three taps is easily a freed row — enough
    // for the fitter to want to regrow the tiles and reflow the columns under the
    // fingers doing the tapping. The right moment to take that space back is when
    // the word is placed and the build bar empties, which is also the moment the
    // player is looking at the scorecard rather than the rack. A genuine resize
    // still wins: the geometry has changed and the old fit is simply wrong.
    const assembling = document.querySelector('.build-tile') !== null;
    if (assembling && lastFit && lastFit.w === width && lastFit.h === height) return;

    let tile = chooseTile(width, height, count, gap, width >= GROW_MIN_WIDTH ? GROW_MAX : MAX);

    // Within one geometry, grow but never shrink. Fewer tiles may free a row and
    // let them grow — which is wanted — but nothing that happens during a turn
    // should make the rack smaller under the player's hands. A real resize
    // changes the geometry and is honoured immediately.
    if (lastFit && lastFit.w === width && lastFit.h === height) {
      tile = Math.max(tile, lastFit.tile);
    }

    const columns = Math.max(1, Math.floor((width + gap) / (tile + gap)));
    const rowsNeeded = Math.ceil(count / columns);
    const rowsThatFit = Math.max(1, Math.floor((height + gap) / (tile + gap)));
    const rows = Math.min(rowsNeeded, rowsThatFit);

    // The rack is exactly a whole number of rows tall. When everything fits this
    // is simply the content height; when it does not, the rack scrolls cleanly
    // instead of exposing a half-height row of clipped letters.
    const maxHeight = rows * tile + (rows - 1) * gap + padY;

    apply(rg, tile, maxHeight);

    // Trust, then verify. If the engine packed one fewer column than the
    // arithmetic predicted, the rack would overflow its whole-row height and the
    // sliced row would be back. Re-measure and step down once if so.
    if (rowsNeeded <= rowsThatFit && rg.scrollHeight > rg.clientHeight + 1 && tile > MIN) {
      const retry = Math.max(MIN, tile - STEP);
      const retryColumns = Math.max(1, Math.floor((width + gap) / (retry + gap)));
      const retryRows = Math.min(
        Math.ceil(count / retryColumns),
        Math.max(1, Math.floor((height + gap) / (retry + gap)))
      );
      tile = retry;
      apply(rg, retry, retryRows * retry + (retryRows - 1) * gap + padY);
    }

    lastFit = { w: width, h: height, n: count, tile };
  } catch (err) {
    // A stale inline size outliving a broken run would be worse than no sizing at
    // all, so hand the rack back to the stylesheet.
    clear(rg);
    lastFit = null;
    console.warn('[Rack Five] rack fit skipped', err);
  }
}

function apply(rg, tile, maxHeight) {
  const tileValue = tile + 'px';
  const heightValue = Math.round(maxHeight) + 'px';
  if (rg.style.getPropertyValue('--rack-tile') !== tileValue) {
    rg.style.setProperty('--rack-tile', tileValue);
  }
  if (rg.style.maxHeight !== heightValue) rg.style.maxHeight = heightValue;
}

function clear(rg) {
  rg.style.removeProperty('--rack-tile');
  rg.style.maxHeight = '';
}

/**
 * Re-fit when the viewport changes. Observes `.game` — a box the fitter never
 * writes to — rather than the rack itself, which would mean watching the very
 * element being resized and re-firing on every write.
 */
export function observeRack() {
  const cleanups = [];
  const refit = () => fitRack();

  const game = document.querySelector('.game');
  if (game && typeof ResizeObserver === 'function') {
    // rAF-deferred: writing inside the callback that reported the resize is what
    // produces "ResizeObserver loop completed with undelivered notifications".
    let queued = false;
    const observer = new ResizeObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fitRack();
      });
    });
    observer.observe(game);
    cleanups.push(() => observer.disconnect());
  }

  // Browser zoom already lands as a size change on `.game`; pinch-zoom does not.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', refit);
    cleanups.push(() => window.visualViewport.removeEventListener('resize', refit));
  }
  window.addEventListener('resize', refit);
  cleanups.push(() => window.removeEventListener('resize', refit));

  // The build-bar reserve is measured from laid-out text, and the woff2 files
  // arrive after first paint. One re-fit once they land.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => fitRack()).catch(() => {});
  }

  return () => cleanups.forEach((fn) => fn());
}

/** Forget everything measured. Called when the board unmounts. */
export function resetRackFit() {
  lastFit = null;
  capCache = { key: '', cap: Infinity };
  reserve = { width: -1, height: 0 };
}
