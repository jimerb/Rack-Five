// The budget invariant.
//
// Rulebook §11, build order item 2: "The budget invariant as an assertion after
// every action. This is the rule V1 got wrong and exactly the kind of thing that
// silently rots during UI work."
//
//   loose + build bar + letters in placed words === the turn's budget
//
// The Build Bar counts as loose: those tiles have left the rack but have not
// been committed to a word.

let violations = [];

export function assertBudget(turn, budget, action = 'unknown') {
  const placed = turn.slots.reduce((a, s) => a + (s ? s.word.length : 0), 0);
  const total = turn.loose.length + turn.build.length + placed;
  if (total !== budget) {
    const message =
      `Budget invariant violated after "${action}": ` +
      `${turn.loose.length} loose + ${turn.build.length} in build bar + ${placed} placed ` +
      `= ${total}, expected ${budget}.`;
    violations.push({ action, total, budget, at: Date.now() });
    // Loud in development, non-fatal in play: a thrown error mid-turn would cost
    // the player their run, which is worse than a wrong number in the HUD.
    console.error('[Rack Five] ' + message);
    return false;
  }
  return true;
}

export function invariantViolations() {
  return violations.slice();
}

export function clearInvariantViolations() {
  violations = [];
}
