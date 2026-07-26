import { html } from '../html.js';
import { standardRuleset } from '../../engine/ruleset.js';
import { rankTable } from '../../engine/rank.js';

export function HowToPlay() {
  const r = standardRuleset();
  const ranks = rankTable(r);

  return html`
    <main class="screen">
      <div class="screen-col w-900">
        <section>
          <div class="kicker">How to play</div>
          <h1 class="howto-title">A word game played like Yahtzee</h1>
          <p class="howto-lede">
            You get a rack of letter tiles instead of five dice. Build five words each turn. A
            word’s <strong>length</strong> becomes its <strong>rank</strong>, and rank plays exactly
            like a die face.
          </p>
        </section>

        <section class="panel panel-pad">
          <h2 class="section-title" style="margin-bottom:14px">Length becomes rank</h2>
          <div class="rank-grid">
            ${ranks.map(
              (row) => html`
                <div class="rank-cell" key=${row.rank}>
                  <span class="rl">${row.length} letters</span>
                  <span class="rr">${row.rank}</span>
                </div>
              `
            )}
          </div>
          <p class="body-14" style="margin-top:14px">
            Three of a kind is three words of equal length. A large straight is five words of
            consecutive lengths. Same Yahtzee logic, new engine — and the app always shows you the
            rank, so you never do the conversion in your head.
          </p>
        </section>

        <section class="grid g-260">
          <div class="panel panel-pad">
            <h3 class="card-title">The letter budget</h3>
            <p class="body-14" style="margin-top:8px">
              Every turn you get a fixed budget, and it counts letters already used in words.
              Refreshes churn the loose pile only — they never hand you extra letters.
            </p>
            <div class="eq-box">27 loose + 13 placed = 40</div>
          </div>
          <div class="panel panel-pad">
            <h3 class="card-title">Difficulty</h3>
            <div class="col" style="gap:7px;margin-top:10px">
              ${['easy', 'medium', 'hard'].map(
                (k) => html`
                  <div key=${k} class="row" style="gap:10px;font-size:14px;flex-wrap:nowrap">
                    <strong style="width:64px;text-transform:capitalize">${k}</strong>
                    <span class="accent" style="width:78px">${r.difficulty[k].budget} letters</span>
                    <span class="muted" style="flex:1">${r.difficulty[k].blurb}</span>
                  </div>
                `
              )}
            </div>
            <p class="body-13" style="margin-top:10px">
              Hard keeps every category available, but a rank-6 Rack Five can’t be made there — five
              8-letter words need 40 letters.
            </p>
          </div>
        </section>

        <section class="panel panel-pad" style="border-color:var(--t-line-2)">
          <h2 class="section-title">Provisional, then permanent</h2>
          <p class="body-14" style="margin-top:8px;max-width:60ch">
            A word you place is <strong class="accent">provisional</strong> — rearrange it,
            dismantle it, reclaim its letters, change a blank, all with no penalty. Then you refresh,
            and every placed word becomes <strong class="accent">permanent</strong>. That’s the only
            genuinely irreversible click in the turn.
          </p>
          <div class="row" style="gap:12px;margin-top:16px;align-items:stretch">
            <div class="example-word provisional">
              <div class="w">MOTELS</div>
              <div class="s">✎ Provisional · tap to edit</div>
            </div>
            <div class="example-word permanent">
              <div class="w">JUKEBOX</div>
              <div class="s">🔒 Permanent</div>
            </div>
          </div>
        </section>

        <section>
          <h2 class="section-title" style="margin-bottom:10px">A turn, step by step</h2>
          <div class="col" style="gap:6px">
            ${[
              ['1', 'Draw', 'All tiles return to the bag and remix. Your full budget is dealt face up.'],
              ['2', 'Build', 'Form valid words of three letters or more into your five slots. They stay editable.'],
              ['3', 'Refresh', `Twice per turn, replace up to ${r.refresh.maximumTiles} loose tiles — and lock in everything you have placed.`],
              ['4', 'Score', 'Enter the five ranks in exactly one open category. Any remaining provisional words go permanent.']
            ].map(
              ([n, title, body]) => html`
                <div key=${n} class="rule-row" style="align-items:flex-start;gap:14px;padding:12px 14px">
                  <span class="display accent" style="font-size:20px;width:20px">${n}</span>
                  <span style="flex:1">
                    <strong style="display:block;font-size:15px">${title}</strong>
                    <span class="body-13">${body}</span>
                  </span>
                </div>
              `
            )}
          </div>
        </section>

        <section class="grid g-250">
          <div class="panel panel-pad">
            <h3 class="card-title">Word Bank</h3>
            <p class="body-14" style="margin-top:8px">
              Only the highest tile-value word in each hand is banked. Concentrate your good letters
              into one showcase word; the other four are pattern work.
            </p>
            <div class="col" style="gap:5px;margin-top:11px;font-size:13px">
              <span>JUKEBOX — rank 5 — <strong class="accent">tile value 27</strong></span>
              <span class="muted">AERATES — rank 5 — tile value 7</span>
            </div>
          </div>
          <div class="panel panel-pad">
            <h3 class="card-title">Jumbo</h3>
            <p class="body-14" style="margin-top:8px">
              The first word of ${r.jumbo.minimumLength} or more letters you play all game earns${' '}
              ${r.jumbo.pointsPerLetter} points per letter, once. It takes no scorecard category.
            </p>
            <div class="row accent display" style="gap:14px;margin-top:11px;font-size:13px">
              <span>9 → 27</span><span>11 → 33</span><span>13 → 39</span>
            </div>
          </div>
          <div class="panel panel-pad">
            <h3 class="card-title">Hints and blanks</h3>
            <p class="body-14" style="margin-top:8px">
              A hint costs ${r.wordBank.hintCost} points off the Word Bank and reveals one valid word
              of a length you choose. ${r.wordBank.maximumHints} per game, and the bank never goes
              negative. A blank counts as one letter, is worth 0, and its letter is fixed once the
              word goes permanent.
            </p>
          </div>
          <div class="panel panel-pad">
            <h3 class="card-title">Timing</h3>
            <div class="col" style="gap:7px;margin-top:10px;font-size:14px">
              <div class="row" style="gap:10px;flex-wrap:nowrap">
                <strong style="width:74px">Relaxed</strong><span class="muted">Untimed</span>
              </div>
              <div class="row" style="gap:10px;flex-wrap:nowrap">
                <strong style="width:74px">Standard</strong><span class="muted">3 minutes per turn</span>
              </div>
              <div class="row" style="gap:10px;flex-wrap:nowrap">
                <strong style="width:74px">Blitz</strong><span class="muted">90 seconds per turn</span>
              </div>
            </div>
            <p class="body-13" style="margin-top:10px">
              At the buzzer, any unfilled slot becomes rank 0.
            </p>
          </div>
          <div class="panel panel-pad">
            <h3 class="card-title">Seeds and replay</h3>
            <p class="body-14" style="margin-top:8px">
              Every run is defined by its seed and difficulty, so the same code deals the same racks
              and the same replacement luck. Share a run code and someone else can play your exact
              letters.
            </p>
          </div>
          <div class="panel panel-pad">
            <h3 class="card-title">If nothing fits</h3>
            <p class="body-14" style="margin-top:8px">
              Take a zero somewhere. That’s part of the game — and any open category can be taken at
              any time, so you are never stuck. Empty slots simply score rank 0.
            </p>
          </div>
        </section>

        <section>
          <h2 class="section-title" style="margin-bottom:10px">The scorecard</h2>
          <div class="grid g-300">
            <div class="col" style="gap:5px">
              <div class="kicker-sm" style="margin-bottom:3px">
                Upper — points per word × words of that length
              </div>
              ${['Ones|3 letters|1', 'Twos|4 letters|2', 'Threes|5 letters|3', 'Fours|6 letters|4', 'Fives|7 letters|5', 'Sixes|8+ letters|6'].map(
                (s) => {
                  const [name, hint, pay] = s.split('|');
                  return html`
                    <div key=${name} class="rule-row">
                      <span style="font-weight:600">${name}</span>
                      <span class="dim">${hint}</span>
                      <strong class="pay">${pay} / word</strong>
                    </div>
                  `;
                }
              )}
              <div class="rule-row" style="border:1px dashed var(--t-line-2);background:transparent">
                <span class="muted">
                  ${r.difficulty.medium.upperBonusThreshold} or more in the upper section adds${' '}
                  <strong class="accent">+${r.upperBonusPoints}</strong>
                </span>
              </div>
            </div>
            <div class="col" style="gap:5px">
              <div class="kicker-sm" style="margin-bottom:3px">Lower</div>
              ${[
                ['Three of a Kind', '3+ of one rank', 'Sum of ranks'],
                ['Four of a Kind', '4+ of one rank', 'Sum of ranks'],
                ['Full House', 'Two ranks, 3 and 2', String(r.lowerSection.fullHouse)],
                ['Small Straight', '4 consecutive', String(r.lowerSection.smallStraight)],
                ['Large Straight', '5 consecutive', String(r.lowerSection.largeStraight)],
                ['Chance', 'Anything', 'Sum of ranks'],
                ['Rack Five', 'All 5 same rank', r.rackFiveMultiplier + ' × rank']
              ].map(
                ([name, hint, pay]) => html`
                  <div key=${name} class="rule-row">
                    <span style="font-weight:600">${name}</span>
                    <span class="dim">${hint}</span>
                    <strong class="pay">${pay}</strong>
                  </div>
                `
              )}
            </div>
          </div>
          <p class="body-13" style="margin-top:12px;max-width:66ch">
            A Rack Five counts for Three of a Kind and Four of a Kind, but${' '}
            <strong style="color:var(--t-text)">not</strong> for a Full House — it has only one
            distinct rank. Rank 0 never satisfies any pattern.
          </p>
        </section>

        <section class="grid g-260">
          <div class="panel panel-dashed panel-pad">
            <div class="row" style="gap:9px">
              <h3 class="card-title">Daily Challenge</h3>
              <span class="badge-soon">Coming soon</span>
            </div>
            <p class="body-14" style="margin-top:8px">
              Everyone plays the same daily letters and compares scores.
            </p>
          </div>
          <div class="panel panel-dashed panel-pad">
            <div class="row" style="gap:9px">
              <h3 class="card-title">Multiplayer</h3>
              <span class="badge-soon">Coming soon</span>
            </div>
            <p class="body-14" style="margin-top:8px">
              Players solve identical racks independently and reveal their results together.
            </p>
          </div>
        </section>

        <section class="panel panel-pad">
          <h3 class="card-title">The big decision, every turn</h3>
          <p class="body-15 muted" style="margin-top:8px;max-width:60ch">
            Do I build the best word I can — or the exact word length my scorecard needs? That
            tension is the whole game.
          </p>
        </section>
      </div>
    </main>
  `;
}
