// Pointer-driven dragging for tiles.
//
// Driven by pointer events, not HTML5 drag: `dragstart` never fires on touch and
// this is a tablet-first design. Listeners live on the window rather than the
// tile, so a re-render mid-drag (which happens on every reorder) cannot strand
// the gesture. A press that never travels 8px is a tap.
//
// Dragging is never the only way to do anything — every drag has a tap
// equivalent (PRD §19.1).

import { moveBuild, moveLoose, tapLoose } from '../../state/store.js';

const THRESHOLD = 8;
let drag = null;

// Taps are handled by the elements' own click handlers, so that Enter and Space
// on a focused tile work exactly like a tap. When a gesture turns into a real
// drag we swallow the click the browser fires afterwards.
function swallowNextClick() {
  const swallow = (e) => {
    e.stopPropagation();
    e.preventDefault();
    window.removeEventListener('click', swallow, true);
    clearTimeout(timer);
  };
  window.addEventListener('click', swallow, true);
  const timer = setTimeout(() => window.removeEventListener('click', swallow, true), 350);
}

function cleanup() {
  if (drag && drag.el) drag.el.classList.remove('is-dragging');
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onCancel);
  drag = null;
}

function onCancel() {
  cleanup();
}

function elementUnder(e) {
  return document.elementFromPoint(e.clientX, e.clientY);
}

function onMove(e) {
  if (!drag) return;
  // A mouse move with no button held means we missed the pointerup.
  if (e.pointerType === 'mouse' && e.buttons === 0) return cleanup();

  if (!drag.moved) {
    if (Math.abs(e.clientX - drag.x) < THRESHOLD && Math.abs(e.clientY - drag.y) < THRESHOLD) return;
    drag.moved = true;
    if (drag.el) drag.el.classList.add('is-dragging');
  }

  const el = elementUnder(e);
  if (!el || !el.closest) return;

  if (drag.kind === 'build') {
    const host = el.closest('[data-bi]');
    if (!host) return;
    const to = Number(host.getAttribute('data-bi'));
    if (!Number.isNaN(to) && to !== drag.index) {
      moveBuild(drag.index, to);
      drag.index = to;
    }
    return;
  }

  const host = el.closest('[data-li]');
  if (host) {
    const targetId = host.getAttribute('data-li');
    if (targetId && targetId !== drag.id) moveLoose(drag.id, targetId);
  }
}

function onUp(e) {
  const d = drag;
  if (!d) return;
  const el = elementUnder(e);
  cleanup();
  if (!d.moved) return; // a press that never moved is a tap — the click handler has it

  swallowNextClick();
  // Dropping a loose tile onto the Build Bar adds it, which is the gesture most
  // people reach for first.
  if (d.kind === 'loose' && el && el.closest && el.closest('[data-dropzone="build"]')) {
    tapLoose(d.id);
  }
}

function begin(e, payload) {
  if (e.button !== undefined && e.button !== 0) return;
  drag = { ...payload, x: e.clientX, y: e.clientY, moved: false, el: e.currentTarget };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}

export function startBuildDrag(e, index, id) {
  begin(e, { kind: 'build', index, id });
}

export function startLooseDrag(e, id) {
  begin(e, { kind: 'loose', id });
}
