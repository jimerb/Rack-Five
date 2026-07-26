import { html, cx } from '../html.js';
import {
  selectCategory,
  clearSelection,
  confirmScore,
  previewScores,
  currentRanks,
  currentTileValues,
  totals,
  me
} from '../../state/store.js';
import { CATEGORIES, category, categoryHelp } from '../../engine/categories.js';
import { explainScore } from '../../engine/evaluator.js';
import { HelpDot, tipProps } from '../Help.js';

/**
 * The upper bonus is a single lump the player either gets or does not, and the
 * row only shows progress. The tooltip names the prize and what is left to pay
 * for it — which matters most under Tile Value Scoring, where the bonus is
 * seeded much higher to keep the upper half worth chasing.
 */
/**
 * The tooltip for a scored row has to explain the turn that actually scored it,
 * not the hand currently on the board — those are almost always different
 * hands. History keeps exactly what is needed: the five ranks and tile values
 * from that turn, and the final points actually awarded (which can differ from
 * a plain re-evaluation when Blind Declaration halved it).
 */
function scoredTip(run, c) {
  const record = run.history.find((h) => h.category === c.key);
  if (!record) return null;
  const explained = explainScore(run.ruleset, c.key, record.ranks, record.tileValues);
  const lines = explained.lines.slice();
  const last = lines.length - 1;
  const recomputed = lines[last][1];
  lines[last] = [lines[last][0], record.categoryPoints];
  return {
    title: c.name,
    lines,
    note: record.halved
      ? `Blind Declaration halved this — it would have scored ${recomputed} at full value.`
      : explained.note
  };
}

function bonusTip(run, t) {
  const prize = run.ruleset.upperBonusPoints;
  const earned = t.bonus > 0;
  const short = Math.max(0, t.threshold - t.upper);
  return {
    title: 'Upper bonus',
    body: earned
      ? `Earned. The six upper categories reached ${t.threshold}, so the card adds a one-off ${prize}.`
      : `Reach ${t.threshold} across the six upper categories and the card adds a one-off ${prize}.`,
    lines: [
      ['Upper section so far', t.upper],
      ['Threshold', t.threshold],
      ...(earned ? [] : [['Still needed', short]]),
      [earned ? 'Bonus' : 'Bonus if you get there', `+${prize}`]
    ],
    note: earned ? null : 'Only the six upper categories count toward this.'
  };
}

export function Scorecard({ state }) {
  const run = state.run;
  const turn = state.turn;
  const player = me(run);
  const preview = previewScores();
  const ranks = currentRanks();
  const t = totals();
  const open = CATEGORIES.filter((c) => player.card[c.key] === null);
  const emptySlots = turn.slots.filter((s) => !s).length;
  const selected = state.helpCat;
  // Under Tile Value Scoring this number drives every lower-section payout, so
  // show it. Without it the "+n" previews look arbitrary.
  const tileScoring = !!run.ruleset.experimentalVariants.tileValueScoring;
  const tileVals = currentTileValues();
  const tileTotal = tileVals.reduce((a, b) => a + b, 0);

  const chips = open
    .map((c) => ({ c, v: preview[c.key] || 0 }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 4);

  const rowFor = (c) => {
    const scored = player.card[c.key] !== null;
    const value = scored ? player.card[c.key] : preview[c.key] || 0;
    const qualifies = !scored && value > 0;
    const isSelected = selected === c.key && !scored;
    // Upper-section rows are plain arithmetic (points per word × word count) —
    // a tooltip on every one of them just means the whole section is a minefield
    // of popups. Only the upper bonus, which is genuinely non-obvious, gets one.
    // Lower-section rows get the working behind the number, but only when there
    // is a number worth explaining: a category that has been scored, or one
    // this hand could score right now. A hand that can't reach it yet ("+0")
    // has nothing to show.
    const tip =
      c.section !== 'lower'
        ? null
        : scored
          ? scoredTip(run, c)
          : value > 0
            ? { title: c.name, ...explainScore(run.ruleset, c.key, ranks, tileVals) }
            : null;
    return html`
      <button
        key=${c.key}
        type="button"
        ...${tipProps(tip)}
        disabled=${scored}
        class=${cx(
          'sc-row',
          scored && 'is-scored',
          isSelected && 'is-selected',
          !scored && !isSelected && qualifies && 'qualifies'
        )}
        onClick=${() => selectCategory(c.key)}
        aria-pressed=${isSelected}
        aria-label=${`${c.name}. ${c.hint}. ${
          scored ? `Scored ${value}` : `This hand would score ${value}`
        }`}
      >
        <span class="nm">${c.name}</span>
        <span class="ht">${c.hint}</span>
        ${scored && html`<span class="st">✓ Scored</span>`}
        ${isSelected && html`<span class="st">Selected</span>`}
        <span class="vl">${scored ? value : '+' + value}</span>
      </button>
    `;
  };

  const help = selected ? category(selected) : null;

  return html`
    <section class="scorecard" aria-label="Scorecard">
      <header class="sc-header">
        <div class="sc-header-row">
          <span class="sc-title">Scorecard</span>
          <${HelpDot} topic="scorecard" label="How the scorecard works" />
          <span class="sc-sub tnum">
            ${open.length} open · ranks ${ranks.join(' · ')}${tileScoring ? ` · tiles ${tileTotal}` : ''}
          </span>
        </div>
        <div class="sc-header-row">
          <span class="sc-take-label">Take now</span>
          ${chips.map(
            (p) => html`
              <button
                key=${p.c.key}
                type="button"
                class=${cx(
                  'sc-chip',
                  selected === p.c.key ? 'is-selected' : p.v > 0 ? 'qualifies' : ''
                )}
                onClick=${() => selectCategory(p.c.key)}
              >
                ${p.c.name} +${p.v}
              </button>
            `
          )}
        </div>
      </header>

      <div class="sc-body">
        <p class="sc-status">
          ${turn.expired
            ? 'Time is up — empty slots score rank 0. Choose one open category to finish the turn.'
            : emptySlots === 0
              ? 'All five words in. Tap any open category to take it.'
              : 'You can take any open category at any time — stuck hands score the empty slots as rank 0.'}
        </p>

        <div class="sc-legend">
          <span><i class="scored"></i>Scored — locked in for the game</span>
          <span><i class="open"></i>+n — what this hand would score now</span>
        </div>

        <div class="sc-sections">
          <div>
            <div class="sc-section-title">Upper section</div>
            <div class="sc-rows">${CATEGORIES.filter((c) => c.section === 'upper').map(rowFor)}</div>
            <div class="sc-bonus" ...${tipProps(bonusTip(run, t))}>
              <span style="font-weight:600">Upper bonus</span>
              <span class="tnum" style="font-size:11px;color:var(--t-dim)">
                ${t.upper} of ${t.threshold} needed
              </span>
              <span class="amt tnum">+${t.bonus}</span>
            </div>
          </div>
          <div>
            <div class="sc-section-title">Lower section</div>
            <div class="sc-rows">${CATEGORIES.filter((c) => c.section === 'lower').map(rowFor)}</div>
          </div>
        </div>
      </div>

      ${help &&
      html`
        <footer class="sc-footer">
          <div class="ft-text">
            <div class="ft-kicker">Not scored yet · step 2 of 2</div>
            <div class="ft-cat">${help.name} — +${preview[help.key] || 0} with this hand</div>
            <div class="ft-help">${categoryHelp(help.key, run.ruleset)}</div>
            <div class="ft-warn">
              Scoring is final and ends the turn.${' '}
              ${emptySlots > 0
                ? `${emptySlots} empty slot${emptySlots === 1 ? '' : 's'} will score rank 0.`
                : ''}
            </div>
          </div>
          <button class="link-action" type="button" style="padding:12px" onClick=${clearSelection}>
            Pick another
          </button>
          <button class="btn" type="button" style="min-height:48px" onClick=${confirmScore}>
            Confirm & end turn
          </button>
        </footer>
      `}
    </section>
  `;
}
