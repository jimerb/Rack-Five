import { html, cx } from '../html.js';
import {
  selectCategory,
  clearSelection,
  confirmScore,
  previewScores,
  currentRanks,
  totals,
  me
} from '../../state/store.js';
import { CATEGORIES, category } from '../../engine/categories.js';
import { HelpDot } from '../Help.js';

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

  const chips = open
    .map((c) => ({ c, v: preview[c.key] || 0 }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 4);

  const rowFor = (c) => {
    const scored = player.card[c.key] !== null;
    const value = scored ? player.card[c.key] : preview[c.key] || 0;
    const qualifies = !scored && value > 0;
    const isSelected = selected === c.key && !scored;
    return html`
      <button
        key=${c.key}
        type="button"
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
          <span class="sc-sub tnum">${open.length} open · ranks ${ranks.join(' · ')}</span>
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
            <div class="sc-bonus">
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
            <div class="ft-help">${help.help}</div>
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
