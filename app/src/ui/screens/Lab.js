import { html, cx } from '../html.js';
import { go, setLabValue, setLabVariant, resetLab } from '../../state/store.js';
import { standardRuleset, lockedVariants } from '../../engine/ruleset.js';

const GROUPS = [
  {
    title: 'Letter pressure',
    rows: [
      { key: 'budget', label: 'Turn budget (overrides difficulty)', unit: 'letters', min: 25, max: 60, step: 1, gate: 'budgetOverride' },
      { key: 'refreshCount', label: 'Refreshes per turn', unit: '', min: 0, max: 4, step: 1 },
      { key: 'refreshMaximumTiles', label: 'Max tiles per refresh', unit: 'tiles', min: 1, max: 20, step: 1 }
    ]
  },
  {
    title: 'Scoring pressure',
    rows: [
      { key: 'upperBonusThreshold', label: 'Upper-bonus threshold', unit: 'pts', min: 30, max: 100, step: 1 },
      // Headroom well past the 100 that Tile Value Scoring seeds — the whole
      // point of that variant is that the upper half has to stay worth chasing.
      { key: 'upperBonusPoints', label: 'Upper-bonus value', unit: 'pts', min: 0, max: 200, step: 5 },
      { key: 'jumboMinimumLength', label: 'Jumbo minimum length', unit: 'letters', min: 7, max: 14, step: 1 },
      { key: 'jumboPointsPerLetter', label: 'Jumbo points per letter', unit: 'pts', min: 1, max: 8, step: 1 }
    ]
  },
  {
    title: 'Assistance',
    rows: [
      { key: 'hintCost', label: 'Hint cost', unit: 'pts', min: 0, max: 15, step: 1 },
      { key: 'maximumHints', label: 'Max hints per game', unit: '', min: 0, max: 6, step: 1 }
    ]
  },
  {
    title: 'Pace',
    rows: [
      { key: 'standardSeconds', label: 'Standard turn', unit: 'sec', min: 60, max: 420, step: 10 },
      { key: 'blitzSeconds', label: 'Blitz turn', unit: 'sec', min: 30, max: 240, step: 10 }
    ]
  },
  {
    title: 'Tile Value Scoring',
    variantGate: 'tileValueScoring',
    rows: tvRows([
      ['tvThreeKind', 'Three of a Kind'],
      ['tvFourKind', 'Four of a Kind'],
      ['tvFullHouse', 'Full House'],
      ['tvSmallStraight', 'Small Straight'],
      ['tvLargeStraight', 'Large Straight'],
      ['tvChance', 'Chance'],
      ['tvRackFive', 'Rack Five']
    ])
  },
  {
    title: 'Red Tile',
    variantGate: 'redTile',
    rows: [
      {
        key: 'redTileRarity',
        label: 'Chance of a red tile per turn',
        unit: '',
        min: 0,
        max: 1,
        step: 0.05,
        format: (v) => `${Math.round(v * 100)}%`
      },
      {
        key: 'redTileMultiplier',
        label: 'Multiplier when its word qualifies',
        unit: '× the category',
        min: 1,
        max: 4,
        step: 0.25,
        format: (v) => v.toFixed(2)
      }
    ]
  },
  {
    title: 'Dictionary Miss Penalty',
    variantGate: 'dictionaryMissPenalty',
    rows: [
      { key: 'missPenaltyFreeMisses', label: 'Free misses per game', unit: 'misses', min: 1, max: 10, step: 1 },
      { key: 'missPenaltyPoints', label: 'Cost of each extra miss', unit: 'pts', min: 1, max: 20, step: 1 }
    ]
  }
];

function tvRows(pairs) {
  return pairs.map(([key, label]) => ({
    key,
    label,
    unit: '× tile value',
    min: 0,
    max: 3,
    step: 0.05,
    format: (v) => v.toFixed(2)
  }));
}

// A 0.05 step can emit 1.7500000000000002, which would then be written to
// localStorage and poison the whole-object comparison that decides whether a run
// counts as Custom. Round once, here, on the way in.
const round2 = (n) => Math.round(n * 100) / 100;

const BANK_METHODS = [
  ['highest_word_each_turn', 'Highest word each turn', 'The standard rule.'],
  ['top_two_half_value', 'Two best at half value', 'Rulebook §5, first ranked fix if hands read as “one good word and four chores”.'],
  ['highest_capped_20', 'Highest word, capped at 20', 'Rulebook §5, second ranked fix.']
];

const VARIANTS = [
  {
    key: 'tileValueScoring',
    name: 'Tile Value Scoring',
    desc: 'On by default — this is the standard scoring mode. The whole lower section pays a multiple of the summed tile value of all five words instead of the rank sum. Qualification is unchanged: Three of a Kind still needs three words of one rank. The upper section stays rank-based and its bonus sits at 100 to compensate; switching this off drops it back to 35.',
    wired: true
  },
  {
    key: 'redTile',
    name: 'Red Tile',
    desc: 'On by default. One rack tile per turn can come up red, weighted towards the harder letters. Any lower-section category a red-tile word helps qualify pays double. Needs Tile Value Scoring, which it switches on and holds there.',
    wired: true
  },
  {
    key: 'dictionaryMissPenalty',
    name: 'Dictionary Miss Penalty',
    desc: 'Five rejected words per game are free; every attempt after that costs points off the final score. Only words that are genuinely not in the dictionary count — an unassigned blank or a duplicate is never charged.',
    wired: true
  },
  {
    key: 'blindDeclaration',
    name: 'Blind Declaration',
    desc: 'Name a target category before the rack is revealed. It scores full value; anything else scores half.',
    wired: true
  },
  {
    key: 'carryOver',
    name: 'Carry-Over',
    desc: 'Keep up to five unspent tiles into the next turn. Skews the next rack’s distribution — that is the point of testing it.',
    wired: true
  },
  {
    key: 'powerLetters',
    name: 'Power Letters',
    desc: 'The first word each turn containing a real J, Q, X or Z earns one free single-tile swap. The budget does not change.',
    wired: true
  }
];

const variantName = (key) => (VARIANTS.find((v) => v.key === key) || {}).name || key;

export function Lab({ state }) {
  const values = state.lab.values;
  const standard = standardRuleset();
  const locked = lockedVariants(values.variants);

  return html`
    <main class="screen">
      <div class="screen-col w-880" style="gap:24px">
        <div>
          <div class="row" style="gap:10px">
            <button class="link-action" type="button" onClick=${() => go('settings')}>← Settings</button>
            <span class="dimmer" style="font-size:13px">/ Advanced</span>
          </div>
          <h1 class="page-title" style="margin-top:6px">Gameplay Lab</h1>
        </div>

        <div class="lab-warning">
          <b>Testing only</b>
          <span class="body-15">
            These controls are for testing game balance. Changing them creates a${' '}
            <strong>Custom Run</strong> and removes the score from standard leaderboards. Slot count,
            the rank bands and the category definitions are deliberately not exposed — they change
            what the scorecard means.
          </span>
        </div>

        <div class="row" style="gap:12px">
          <span class="body-13">
            Ruleset <strong style="color:var(--t-text)">${standard.rulesetVersion}</strong>
          </span>
          ${state.lab.enabled && html`<span class="badge-custom">Modified from standard</span>`}
          <button class="btn-ghost sm spacer" type="button" onClick=${resetLab}>
            Reset to Standard Rules
          </button>
        </div>

        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px">
          ${GROUPS.map(
            (group) => html`
              <section key=${group.title} class="panel lab-panel">
                <div class="kicker-sm" style="margin-bottom:12px">${group.title}</div>
                ${group.variantGate &&
                !values.variants[group.variantGate] &&
                html`<p class="body-13" style="margin:-6px 0 12px">
                  Turn on the ${variantName(group.variantGate)} variant below to use these.
                </p>`}
                <div class="lab-rows">
                  ${group.rows.map((row) => {
                    const groupOff = group.variantGate && !values.variants[group.variantGate];
                    const gated = groupOff || (row.gate && !values[row.gate]);
                    return html`
                      <div key=${row.key} class="lab-row">
                        <div class="lab-row-head">
                          <span class="lbl">${row.label}</span>
                          <strong class="val">
                            ${row.format ? row.format(values[row.key]) : values[row.key]}
                          </strong>
                          <span class="unit">${row.unit}</span>
                        </div>
                        <input
                          type="range"
                          min=${row.min}
                          max=${row.max}
                          step=${row.step}
                          value=${values[row.key]}
                          disabled=${gated}
                          aria-label=${row.label}
                          onInput=${(e) => setLabValue(row.key, round2(Number(e.target.value)))}
                        />
                        ${row.gate &&
                        html`
                          <label class="row" style="gap:8px;margin-top:6px;font-size:12px;color:var(--t-muted)">
                            <input
                              type="checkbox"
                              checked=${!!values[row.gate]}
                              onChange=${(e) => setLabValue(row.gate, e.target.checked)}
                            />
                            Override every difficulty with this budget
                          </label>
                        `}
                      </div>
                    `;
                  })}
                  ${group.title === 'Pace' &&
                  html`<div class="lab-soon">
                    Short game · 6 rounds
                    <span class="spacer" style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">
                      Coming soon
                    </span>
                  </div>`}
                </div>
              </section>
            `
          )}
        </div>

        <section class="panel lab-panel">
          <div class="kicker-sm" style="margin-bottom:12px">Word Bank method</div>
          <div class="col" style="gap:7px">
            ${BANK_METHODS.map(
              ([key, name, desc]) => html`
                <button
                  key=${key}
                  type="button"
                  class=${cx('dict-card', values.wordBankMethod === key && 'is-on')}
                  aria-pressed=${values.wordBankMethod === key}
                  onClick=${() => setLabValue('wordBankMethod', key)}
                >
                  <span class="dict-head"><span class="dict-name">${name}</span></span>
                  <span class="dict-desc">${desc}</span>
                </button>
              `
            )}
          </div>
        </section>

        <section>
          <div class="row" style="align-items:baseline;gap:10px;margin-bottom:10px">
            <h2 class="section-title">Experimental variants</h2>
            <span class="body-13">
              Tile Value Scoring and Red Tile are on by default; the rest are off. Only the two
              defaults ship as standard Phase 1 rules.
            </span>
          </div>
          <div class="col" style="gap:7px">
            ${VARIANTS.map(
              (v) => html`
                <div key=${v.key} class="row-toggle">
                  <span class="rt-text">
                    <span class="rt-name">${v.name}</span>
                    <span class="rt-desc">
                      ${v.desc}
                      ${locked[v.key] &&
                      html`<em style="display:block;margin-top:4px">
                        Held on by ${variantName(locked[v.key])}.
                      </em>`}
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked=${!!values.variants[v.key]}
                    aria-label=${v.name}
                    disabled=${!!locked[v.key]}
                    class=${cx('switch', values.variants[v.key] && 'is-on')}
                    onClick=${() => setLabVariant(v.key, !values.variants[v.key])}
                  >
                    <span class="knob"></span>
                  </button>
                </div>
              `
            )}
          </div>
        </section>

        <section class="panel lab-panel">
          <div class="kicker-sm">Not exposed here, on purpose</div>
          <p class="body-13" style="margin:8px 0 0">
            These change what the scorecard means, so they live in the ruleset file and require a
            new ruleset version.
          </p>
          <div class="lab-locked">
            ${standard.structuralSafeguards.locked.map((k) => html`<span key=${k}>${k}</span>`)}
          </div>
        </section>

        <div class="row">
          <button class="btn" type="button" onClick=${() => go('setup')}>Back to setup</button>
          <span class="body-13">
            ${state.lab.enabled
              ? 'Your next run will be marked Custom.'
              : 'Everything matches standard rules — runs stay leaderboard eligible.'}
          </span>
        </div>
      </div>
    </main>
  `;
}
