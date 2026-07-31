# Handoff: Rack Five — Solo Arcade (Phase 1)

## Overview

Rack Five is a word game built on the structure of Yahtzee. Instead of rolling five dice,
the player fills **five word slots** from a visible rack of letter tiles. Each word's
**length** becomes its **rank** (1-6), and those five ranks are scored into a 13-category
Yahtzee-style scorecard.

The central tension the product must keep visible at all times:

> Do I build the best word I can, or the word length my scorecard needs?

This bundle documents a complete, playable design mockup of the Phase 1 Solo Arcade
experience: Home, Setup, Gameplay, Scorecard, Results, Leaderboards, How to Play,
Settings (with a persistent theme picker), and the Advanced Gameplay Lab.

**Rule authority:** `source-docs/rack-five-rulebook-v3.md`
**Product scope authority:** `source-docs/rack-five-product-requirements-document.md`
**Player-facing help copy:** `source-docs/rack-five-quickstart.md`

---

## Running the app

The prototype is plain ES modules, so it must be served over `http://`, not opened
directly from the file system.

```bash
powershell -ExecutionPolicy Bypass -File app/serve.ps1 -Port 8124
```

Or double-click `app/serve.cmd` (defaults to port 8123; pass `-Port 8124` as an
argument to match that instead). The server opens your browser automatically unless
you pass `-NoBrowser`. It has no dependencies — a raw `TcpListener`, no admin rights,
no Node/Python required.

---

## About the design files

The files in this bundle are **design references created in HTML**. They are prototypes
showing intended look, structure and behaviour — **not production code to copy directly**.

`Rack Five.dc.html` is a single self-contained HTML file with an embedded game engine.
It runs in a browser with no build step. Its purpose is to let you *play* the flow and
read exact values, not to be lifted into the app.

**The task is to recreate these designs in your target codebase's existing environment**
(React, Vue, SwiftUI, Kotlin/Compose, etc.) using its established patterns, component
library and state management. If no environment exists yet, choose the framework that
best fits the product and implement the designs there.

The engine logic in the prototype (seeded RNG, rank conversion, scorecard evaluator,
budget invariant) is **correct and worth porting** — see "Engine reference" below. The
markup and inline styles are **not**.

## Fidelity

**High-fidelity.** Colours, typography, spacing, radii, shadows, interaction states and
copy are final. Recreate the UI faithfully using your codebase's libraries and patterns.
Exact values are in `tokens.css` and in the per-screen sections below.

---

## Screens and views

### 1. Home

**Purpose:** Entry point. Start, resume, or replay a run; see personal bests; preview
future modes.

**Layout:** Single centred column, `max-width: 1020px`, page padding
`clamp(20px,5vh,56px) clamp(14px,3vw,28px) 48px`, vertical `gap: 26px`. The screen
scrolls internally (`overflow: auto`) inside a fixed-height app shell.

**Components:**
- **Hero row** — flex, wraps, `gap: clamp(16px,4vw,44px)`.
  - Left (`flex: 1 1 380px`): kicker "SOLO ARCADE" (12px, letter-spacing .18em, uppercase,
    `--t-acc`); headline "Five words. / One scorecard." (display font,
    `clamp(38px,7vw,62px)`, line-height .98, letter-spacing -.02em); body paragraph
    (16px/1.55, `--t-muted`, `max-width: 46ch`, `text-wrap: pretty`).
  - Right (`flex: 0 1 320px`): five letter tiles spelling R A C K 5, each
    `aspect-ratio: 1`, `border-radius: var(--t-rad-sm)`, background `--t-tile`,
    shadow `inset 0 1px 0 var(--t-tile-hi), inset 0 -2px 0 var(--t-tile-lo), 0 4px 9px rgba(0,0,0,.4)`.
    Letter: display font 600, `clamp(24px,4.4vw,34px)`. Tile value: 11px/600, bottom-right,
    `--t-tile-val`.
- **Action row** — "Play Solo" primary button (min-height 52px, padding 0 34px, 17px display
  700); "Resume — turn N of 13" (only when a saved run exists, outlined `--t-line-2`);
  "Play a Seed" (outlined `--t-line`).
- **Stat cards** — `grid-template-columns: repeat(auto-fit, minmax(232px,1fr))`, `gap: 12px`.
  Personal best / Games played / Best banked word. Each: panel fill, 1px `--t-line`,
  `border-radius: var(--t-rad)`, padding 18px 20px. Kicker 11px uppercase `--t-dim`;
  figure 42px display 700 `--t-acc-hi`; meta 13px `--t-muted`.
- **Coming-soon cards** — `repeat(auto-fit, minmax(300px,1fr))`, dashed `--t-line-2` border.
  Daily Challenge and Multiplayer. Each carries a pill badge "Coming soon"
  (10px/700, letter-spacing .1em, `--t-acc-soft` fill, `--t-acc` text, radius 999px).
  Copy: "Everyone plays the same daily letters, whenever they like, and compares scores on
  one board." / "Identical letters and identical replacement luck. Everyone solves alone,
  then results are revealed together." These must look intentional, never broken, and must
  not start incomplete workflows.
- **Footer line** — 12px `--t-dimmer`, top border, "Prototype build · ruleset phase1.0 ·
  shared leaderboard active" or the static-host fallback "scores are stored on this device".

### 2. Game setup

**Purpose:** Choose difficulty, timing, seed and ruleset before starting a run.

**Layout:** Centred column, `max-width: 940px`, `gap: 26px`.

**Components:**
- **Difficulty picker** — `repeat(auto-fit, minmax(216px,1fr))`, `gap: 10px`. Three cards:
  Easy 45 letters / Medium 40 letters (default) / Hard 35 letters. Selected card:
  `--t-acc-soft` fill, **2px** solid `--t-acc`. Unselected: panel fill, 1px `--t-line`.
  Each card: name (20px display 700), tag ("Default" / "No rank-6 Rack Five", 10px/700
  uppercase `--t-acc`), letter count (14px display, `--t-acc-hi`), blurb (13px/1.45 `--t-muted`).
  Blurbs: "More letters, more possible solutions" / "The standard game" / "Fewer letters,
  tighter decisions".
- **Hard warning** — shown only when Hard is selected. `--t-acc-soft` fill, 1px `--t-line-2`.
  "Every category stays reachable, but a rank-6 Rack Five cannot be made — five 8-letter
  words need 40 letters and you only have 35."
- **Timing picker** — same card pattern. Relaxed (Untimed) / Standard (3 minutes per turn,
  default) / Blitz (90 seconds per turn).
- **Game length** — "Full · 13 rounds" selected; "Short · 6" disabled with a "Coming soon"
  badge and dashed border.
- **Seed** — generated code shown as `RF-XXXXX` (20px display 600, letter-spacing .1em,
  `--t-acc-hi`), "Generate new" text action, plus a text input for entering a shared run
  code (min-height 42px, `--t-inset` fill, 1px `--t-line`).
- **Ruleset toggle** — a pill that switches between "Standard Rules — leaderboard eligible"
  and "Custom Rules — this run will not enter standard leaderboards". Link through to the
  Gameplay Lab.
- **Start Game** — primary button, min-height 56px, padding 0 40px, 18px display 700, with a
  summary line beside it ("Medium · 40 letters · 3:00 per turn · 13 rounds").

### 3. Gameplay — the most important screen

**Layout (tablet landscape / desktop):**

```
app shell        height:100vh; overflow:hidden; flex column
├── nav          flex:none
└── game screen  flex:1; min-height:0; flex column; gap:10px; padding:10px clamp(12px,2.4vw,24px) 12px
    ├── HUD      flex:none  (wraps)
    └── main row flex:1; min-height:0; overflow:auto; flex; flex-wrap:wrap; gap:12px
        ├── left column   flex:1 1 520px; min-width:0; min-height:0; overflow:auto; gap:12px
        │   ├── loose rack panel
        │   ├── "length becomes rank" strip
        │   ├── build bar
        │   ├── expired banner / error banner (conditional)
        │   ├── five word slots
        │   └── progress strip
        └── right column  flex:1 1 330px; min-height:0; gap:10px
            ├── action buttons row   flex:none
            └── scorecard panel      flex:1; min-height:0; overflow:hidden; flex column
                ├── header  flex:none   (title, open count, "Take now" chips)
                ├── rows    flex:1; min-height:0; overflow:auto
                └── footer  flex:none   (confirmation, conditional)
```

Below ~900px the main row wraps to two stacked lines and becomes the scroll container.
**Critical:** the scorecard must never require scrolling the page to reach — it is a core
part of the game and cannot be collapsed or hidden. There is deliberately no
show/hide control.

**HUD (`flex:none`, wraps, gap 12px 18px, panel fill, 1px `--t-line`, radius `--t-rad`,
padding 11px 16px):**
- Difficulty chip — 11px/600 uppercase, `--t-acc`, 1px `--t-line-2`, radius 4px.
- "Turn N / 13" — 14px `--t-muted`, number in `--t-text`.
- **Budget equation** — permanently visible, per rulebook §3:
  `Budget  27 loose + 13 placed = 40`. Label 11px/600 uppercase `--t-dim`; numbers display
  700; total in `--t-acc-hi`. The word "placed" becomes "permanent" once any word is locked.
- Budget bar — `flex:1 1 60px`, height 6px, radius 999px, `--t-inset` track; filled segment
  `--t-acc` sized to placed/budget, second segment `--t-acc-soft` sized to loose/budget.
- Refresh group — label + one dot per refresh (11px circle; remaining = `--t-acc` with
  `0 0 8px rgba(217,165,76,.6)` glow, spent = `--t-inset` with 1px inset border) + "N left".
- Bank — label + value (19px display 700, `--t-acc-hi`).
- Jumbo — label + "Open · 9+ letters" or "WORD +N".
- Timing label + clock — clock 26px display 700, `font-variant-numeric: tabular-nums`.
  At **≤30 seconds remaining** the clock switches to `--t-warn`.

**Loose rack panel:** header row with "LOOSE RACK" (12px display 700, letter-spacing .14em,
uppercase, `--t-muted`), and a segmented sort control (Draw / A–Z / Value) built as a single
joined `inline-flex` with 1px `--t-line` border, radius `--t-btn-rad`, options
`padding:7px 13px; font-size:13px`. Active option: `--t-acc-soft` fill, `--t-acc-hi` text,
`inset 0 0 0 1px var(--t-acc)`, weight 600.

Tile grid: `grid-template-columns: repeat(auto-fill, minmax(56px,1fr)); gap:7px`. Each tile
`aspect-ratio:1; min-height:52px`, radius `--t-rad-sm`, background `--t-tile`, shadow
`inset 0 1px 0 var(--t-tile-hi), inset 0 -2px 0 var(--t-tile-lo), 0 4px 8px rgba(0,0,0,.42)`.
Letter `clamp(20px,2.4vw,27px)` display 600 `--t-tile-text`; value 10px/600 bottom-right
`--t-tile-val`. In refresh-selection mode a selected tile gets
`0 0 0 3px var(--t-acc)`, `transform: translateY(-3px)`, `opacity:.6`.

**"Length becomes rank" strip:** horizontal chips 3→1, 4→2, 5→3, 6→4, 7→5, 8+→6. Sits
directly under the rack so the mapping is never mental arithmetic.

**Build bar:** gradient panel (`linear-gradient(180deg, var(--t-acc-soft), var(--t-panel))`),
1px `--t-line-2`, radius `--t-rad`, padding 12px 16px, flex wrap, gap 14px.
- Tiles: 54×54, radius `--t-rad-sm`, `transform: translateY(-2px)`, `cursor: grab`,
  `touch-action: none`, `user-select: none`. Blank tiles use `--t-blank` fill with
  `0 0 0 2px var(--t-blank-bd)` and `--t-blank-text`.
- Live readout: word (21px display 700, letter-spacing .1em) and
  "7 letters → **rank 5** · tile value 8".
- Undo (outlined, min-height 44px) and **Place word** (primary, min-height 46px).

**Word slots:** `grid-template-columns: repeat(auto-fit, minmax(178px,1fr)); gap:9px`,
each `min-height:150px`, radius `--t-rad`, padding 11px 13px.
- Empty: `--t-inset` fill, `inset 0 2px 8px rgba(0,0,0,.5)`, label "Empty",
  status "EMPTY → SCORES RANK 0".
- Provisional: `--t-acc-soft` fill, **2px dashed** `--t-acc`, status "✎ PROVISIONAL · TAP TO EDIT".
- Permanent: `--t-panel-2` fill, **2px solid** `--t-acc`, status "🔒 PERMANENT".
- Content: slot number (10px/700 uppercase `--t-dim`), optional "MONEY WORD" tag on the
  highest tile-value word, letter chips (24×28, radius 4px), then rank (26px display 700
  `--t-acc-hi`) and tile value (15px display 700).
- Status must not rely on colour alone — hence the dashed/solid border and the glyph.

**Progress strip:** "N of 5 WORDS PLACED" (20px display 700 `--t-acc-hi`) plus a next-step
sentence that always names every legal move, including taking a category early.

**Scorecard panel:** see §5.

**Action buttons row** (right column, `flex:none`, wrapping): Refresh loose tiles /
Refresh N tiles + Cancel (in selection mode) / disabled state with reason / Hint.

### 4. Gameplay states to implement

Fresh rack · tiles selected into the Build Bar · valid provisional word · invalid word with
reason · blank assignment · editing or removing a provisional word · refresh tile selection ·
refresh permanence warning · rack after refresh · permanent locked words · scorecard preview ·
Jumbo earned · hint purchase and result · timer nearly expired · timed-out hand with rank-0
slots · scoring confirmation · turn-complete summary.

**Modals** (backdrop `rgba(6,12,10,.72)` + `backdrop-filter: blur(3px)`, z-index 60;
dialog `width:min(520px,100%)`, `--t-bg` fill, radius `--t-rad`, `0 26px 60px rgba(0,0,0,.6)`,
`animation: r5pop .2s ease`):

- **Refresh warning** — title "This step is irreversible". Body must state *both* effects and
  the tile count: "Refreshing will replace **N loose tiles** — and it makes **every word you
  have placed permanent**. Permanent words can't be dismantled, their letters can't be
  reclaimed, and blank assignments are fixed." Plus a reassurance panel: "Your budget does not
  change. Letters already used in words are never replaced." Actions: "Keep rearranging" /
  "Replace N tiles & commit".
- **Blank assignment** — 26 letter buttons, `repeat(auto-fill, minmax(48px,1fr))`, min-height 48px.
- **Hint** — explains cost and limit (both read from config), then six length buttons 3–8 each
  showing the rank it maps to.
- **Hint result** — the revealed word at 34px display 700, letter-spacing .1em, plus the
  caveat that it may not be the best use of the tiles.
- **Jumbo** — celebration. "JUMBO" at 46px display 700 with `animation: r5glow 1.6s ease infinite`,
  the word, and "+N added outside the scorecard".
- **Turn summary** — category and points, the five ranks, banked word and value, Word Bank
  total, running total, "Next turn".
- **Timeout** — 2px `--t-warn` border. "Your placed words are safe and now permanent. Any
  empty slot becomes **rank 0**."

### 5. Scorecard

Always visible, never collapsible. Three-part flex column so the confirmation can never be
clipped and the rows always keep their own scroll:

- **Header** (`flex:none`, `--t-toast` fill, 1px `--t-line` bottom): "SCORECARD",
  "N open · ranks 4 · 0 · 0 · 0 · 0", and a **"Take now"** chip row — the four best-scoring
  open categories. Chips are min-height 40px and use the *same click handler as the rows*, so
  they select and never score directly.
- **Rows** (`flex:1; min-height:0; overflow:auto`): a status sentence, a legend, then Upper
  and Lower sections in a `repeat(auto-fit, minmax(280px,1fr))` grid (collapses to one column
  in the sidebar).
- **Footer** (`flex:none`, conditional): the confirmation panel.

**Row states — these must be unmistakably distinct:**

| State | Fill | Border | Badge | Value |
|---|---|---|---|---|
| Scored | `--t-inset` | `border-left: 4px solid var(--t-ok)` | "✓ Scored" in `--t-ok` | plain number, `--t-text` |
| Selected | `--t-acc-soft` | 2px `--t-acc` + `0 0 0 3px var(--t-acc-soft)` | "Selected" | `+n`, `--t-acc-hi` |
| Open, qualifying | `--t-acc-soft` | 1px `--t-line-2` | — | `+n`, `--t-acc-hi` |
| Open, no points | `--t-panel` | 1px `--t-line` | — | `+0`, `--t-dimmer` |

A legend states both conventions: "Scored — locked in for the game" and
"+n — what this hand would score now". Never use the word "Locked" as a status; it reads as
"you cannot score yet".

**Scoring is a deliberate two-step.** Tapping a row or chip only *selects*. The footer then
shows: kicker "Not scored yet · step 2 of 2", the category and its points, the rule text
(clamped to 2 lines), a warning "Scoring is final and ends the turn." plus "N empty slots will
score rank 0." when relevant, and two actions — "Pick another" and **"Confirm & end turn"**.

**Any open category can be taken at any time.** There is no slot-count, refresh or timer
gate. A player who cannot find more words must always be able to advance — take 4 in Fours,
or a zero anywhere. Empty slots score rank 0.

Upper bonus row is a dashed panel showing "N of 63 needed" and the bonus value. Both numbers
are read from the effective ruleset, so a Lab change is reflected live.

When the **Tile Value Scoring** variant is on, the header line appends the live summed tile value
("N open · ranks 1 · 1 · 1 · 1 · 1 · tiles 30") — that number drives every lower-section payout,
and without it the "+n" previews look arbitrary. The footer help text switches to the tile-value
wording for the seven lower categories, with the live multiplier interpolated. The row hints do
not change: they describe *qualification*, which the variant leaves alone.

### 6. Results

Large final score (`clamp(64px,13vw,116px)` display 700, `--t-acc-hi`), optional "Personal
best" badge, dot-leader breakdown (Scorecard / Upper bonus / Word Bank / Jumbo / Hints /
Total), actions (Replay This Run / Share This Seed / Play Another), a run-identity panel
(difficulty, timing, seed, ruleset version, dictionary version) with the suggested share text,
a leaderboard placement card, the completed 13-row scorecard, and a per-turn breakdown
(words, ranks, category, points, banked word).

### 7. Leaderboards

Shared on Codex Sites and local-only on static hosts. Tabs Easy / Medium / Hard plus a disabled **Friends** tab labelled "Coming soon".
Timing filter pills (All / Relaxed / Standard / Blitz). Rows show placing, score (26px display
700 `--t-acc-hi`), timing · date · duration, a metadata line (card / bank / jumbo / upper /
hints), the seed, a variant tag when the run used any (e.g. "Tile Value"), and a Standard or
**Custom** badge. Custom runs never enter standard boards. The variant tag matters because all
custom runs share one section — a tile-value run and a carry-over run are no more comparable to
each other than either is to a standard run.
Rows are keyboard and touch accessible and open the stored Results-style recap. Older entries without
recap data show their available metadata and an explicit missing-detail message. Empty state shows
rank chips and "No <Difficulty> runs yet". Tie-break order:
score → fewer hints → shorter duration → earlier date.

### 8. How to Play

Built from the quick-start guide. Sections: the core idea; length-becomes-rank (a six-cell
grid at 34px); the letter budget (with the literal equation); difficulty; provisional vs
permanent (side-by-side dashed and solid examples); Word Bank (JUKEBOX 27 vs AERATES 7);
Jumbo; hints and blanks; seeds and replay; the full scorecard tables; and the coming-soon
modes.

### 9. Settings

- **Theme picker** — three preview cards, `repeat(auto-fit, minmax(240px,1fr))`. Each shows a
  112px live preview painted in that theme's own `--t-bg` / `--t-bg-grad`, with a kicker
  pill, three sample tiles and an accent bar; then name, "Selected" marker and mood line.
  Selection persists across the whole app and must be saved.
- Toggles: Sound effects, Haptics, Reduced motion, Strict dictionary, Playtest instrumentation.
  Track 46×26 radius 999px; knob 20×20; on = `--t-acc` fill.
- Default rack sorting pills; Reset tutorial; Gameplay Lab entry; Export Playtest Data.

### 10. Advanced Gameplay Lab

Warning banner: "These controls are for testing game balance. Changing them creates a
**Custom Run** and removes the score from standard leaderboards. Slot count, the rank bands
and the category definitions are deliberately not exposed — they change what the scorecard
means."

Five grouped slider panels — Letter pressure (turn budget, refresh count, max tiles per
refresh), Scoring pressure (upper-bonus threshold and value, Jumbo minimum length and points
per letter), Assistance (hint cost, max hints), Pace (standard and blitz turn seconds, plus a
disabled Short-game row), and Tile Value Scoring (a multiplier per lower-section category).

The Tile Value Scoring panel is **gated on its variant toggle** — its seven sliders stay disabled,
with an explanatory line, until the variant is switched on. Its sliders step by 0.05 and are
rounded to two decimals on set; an unrounded float would otherwise reach localStorage and
permanently break the whole-object comparison that decides whether a run counts as Custom.

Then four experimental variant toggles, all **off** by default: Tile Value Scoring, Blind
Declaration, Carry-Over, Power Letters. Turning Tile Value Scoring on also seeds the upper-bonus
value to 100 (and restores 35 on the way out), because that variant roughly doubles what the lower
section pays; a bonus the player has already moved by hand is left alone.

Plus "Reset to Standard Rules", the ruleset version, and a "Modified from standard" badge.

---

## Interactions and behaviour

**Tile selection.** Tap a loose tile to move it to the Build Bar; tap a Build Bar tile to send
it back. Dragging is supported but is never the only way to do anything.

**Build Bar reordering.** Driven by **pointer events**, not HTML5 drag — `dragstart` never
fires on touch and this is a tablet-first design. On `pointerdown` capture the pointer and
record the index and origin. On `pointermove`, if the pointer has travelled ≥8px, resolve the
element under it via `elementFromPoint`, read its `data-bi` index and reorder. On
`pointerup`, a press that never moved 8px is treated as a **tap** (return the tile to the
rack). Guard against a stuck drag with `if (e.pointerType === 'mouse' && e.buttons === 0)`.
The reorder must use a **functional state update** — pointermove fires far faster than the
UI commits, and reading a stale snapshot scrambles the letters.

**Placing a word.** Validate in this order: blank assigned → minimum length → not a duplicate
in this hand → in dictionary (when strict mode is on) → a free slot exists. Each failure gets
its own specific message. No confirmation dialog on placing — words are provisional anyway.

**Editing.** Tapping a provisional slot dismantles it and returns its letters to the loose
pile. Permanent slots are inert.

**Refresh.** Entering refresh mode automatically returns Build Bar tiles to the loose pile
(they were always loose). Select 1..cap tiles, confirm through the warning modal, then:
mark every provisional slot permanent, move selected tiles to discard, draw the same number
from the replacement queue, advance the queue index, decrement refreshes, assert the budget
invariant. **Never discard more tiles than the queue can replace.**

**Timer.** Ticks once per second while on the gameplay screen with no modal open. At zero:
set an `expired` flag, empty the Build Bar back into the loose pile, stop all tile
interaction, open the timeout modal, and require a category selection. A persistent "Turn
over" banner keeps the state legible after the modal is dismissed.

**Animations.** `r5pop` (.2s scale-in, modals), `r5rise` (.25s translateY, toasts and the
confirmation footer), `r5glow` (1.6s box-shadow pulse, Jumbo), `r5pulse` (2s outline-color
pulse — used where a box-shadow must be preserved). All must respect the Reduced motion setting.

**Responsive.** Tablet-first. Above ~900px the play area and scorecard sit side by side.
Below that the columns wrap and the main row scrolls. The rack grid is
`repeat(auto-fill, minmax(56px,1fr))` so it reflows by itself; tile identity and selection
state must survive the reflow. Touch targets are never below 44px.

**Accessibility.** Keyboard operation for every gameplay action; screen-reader labels on every
tile including value and status; an announcement when a word becomes permanent; non-colour
indicators for loose / provisional / permanent; high-contrast mode; scalable text; reduced
motion; timer announcements at configurable thresholds. All text colours in `tokens.css`
clear 4.5:1 against the surface they sit on in all three themes.

---

## State management

```
appState = {
  screen, theme, settings, saved, bests, lb, lab,
  run, turn, modal, toast, helpCat
}

run = {
  runId, seed, difficulty, budget, timing, gameLength, mode:'solo', matchId:null,
  isCustom, rulesetVersion, rngVersion, dictionaryId, dictionaryVersion,
  tileDistributionId, tileDistributionVersion,
  players: [playerState],          // length 1 in Phase 1 — and that is the point
  card, wordBank, jumboClaimed, jumboPoints, jumboWord,
  hintsUsed, hintSpent, turnNo, history, startedAt, completedAt, finalScore
}

turn = {
  loose[], build[], slots[5], queue[], queueIndex, refreshesLeft,
  secondsLeft, expired, mode:'build'|'refresh', refreshSel[], hintWord, error
}

slot = { word, letters:[{c,blank}], rank, tileValue, provisional, tiles[] }
```

**The invariant, asserted after every action:**

```
turn.loose.length + turn.build.length + sum(filled slots' word lengths) === run.budget
```

Never let the code assume `players` has exactly one entry — Phase 2 and 3 depend on it.

**Autosave** after every placed word, provisional edit, refresh, hint, scored turn and on
backgrounding. Relaxed games pause when backgrounded; Standard and Blitz preserve remaining
time and record the interruption in the action log.

**Action log.** Every run maintains a replayable sequence: turn started, intent selected, tile
selected/deselected, word placed, word edited/removed, blank assigned, refresh tiles selected,
refresh confirmed, hint requested, word suggested, category considered after refresh, category
selected, timer expired, pause/resume, turn completed, run completed.

---

## Engine reference

The prototype's engine is correct and worth porting. Key pieces:

- **Seeded generation.** Never call `Math.random()` for gameplay. FNV-1a hash of
  `seed + ':' + turnNo` into a mulberry32 PRNG, Fisher-Yates shuffle of the full 100-tile bag,
  first `budget` tiles are the opening rack and the next 20 are the ordered replacement queue.
  Same `(seed, difficulty)` always yields identical racks *and* identical replacement luck.
- **Rank conversion.** `len < 3 ? 0 : len >= 8 ? 6 : len - 2`.
- **Scorecard evaluator.** Takes five ranks, returns what every category pays. Roughly 80
  lines and it is the entire game. Qualification rules: Four of a Kind and Rack Five both
  count as Three of a Kind; Rack Five counts as Four of a Kind; **Rack Five does not qualify
  as a Full House** (only one distinct rank); Small Straight needs four distinct consecutive
  non-zero ranks and the fifth word can be anything; Large Straight needs all five distinct
  and consecutive; **rank 0 never satisfies any pattern**.
- **Tile Value Scoring** (experimental, off by default). The lower section pays
  `round(summed tile value × a per-category multiplier)` instead of the rank sum. Qualification is
  computed once and is identical either way — the variant changes what a category *pays*, never
  what it *requires*. Rounding happens inside the evaluator, before any consumer sees the number.
  Rack Five drops its rank term entirely. Because a run snapshots its ruleset into local storage,
  the evaluator must tolerate a saved ruleset that predates the variant block.
- **Word Bank.** Only the single highest tile-value word per hand is banked. Blanks are 0.
  Hint costs are deducted once, at purchase; never deduct again at scoring. The bank cannot
  go negative.
- **Jumbo.** First word of 9+ letters in the whole game, 3 points per letter, once only,
  occupies no category.
- **Dictionary.** The prototype ships a ~1,300-word demo subset and defaults **Strict
  dictionary off** so play never blocks. Production needs a real versioned dictionary (TWL or
  SOWPODS) in a Set for O(1) lookup. For hints, filter the dictionary by target length and
  test each candidate against the rack multiset — **do not enumerate rack subsets**. Never
  auto-highlight every findable word.

Files: `ruleset.json` holds the versioned configuration object. All gameplay numbers must be
read from one authoritative ruleset, never scattered as constants.

---

## Design tokens

Full definitions are in `tokens.css`, which declares all three themes as CSS custom-property
blocks. Summary:

**Themes.** Feltwork (default, dark felt table with ivory tiles and brass), Midnight (dark,
quiet blue-grey with a blurple accent used as line and glow), Sandbar (light, warm cream board
with terracotta and sage). Themes change ground, tile treatment, scorecard treatment, accent
colours, radii, type and button style — they are distinct environments, not a colour toggle.
The selected theme persists and applies everywhere.

**Typography.** Feltwork: Space Grotesk (display, 700) over IBM Plex Sans (body).
Midnight: Inter over Inter, display weight 500. Sandbar: Caprasimo over Figtree, display
weight 400. Scale: 42/38/34/26/21/19/17/16/15/14/13/12/11/10px. Numerals in the HUD and
scorecard use `font-variant-numeric: tabular-nums`.

**Radii.** Feltwork 10px / 6px, Midnight 14px / 8px, Sandbar 28px / 16px. Buttons: Feltwork
6px, Midnight 8px, Sandbar 999px.

**Buttons.** Feltwork primary is a brass gradient with a `0 3px 0 #7d5b1f` seated lip.
Midnight primary is an **accent outline on transparent** — never a fill. Sandbar primary is a
solid terracotta pill. This difference is prescribed by the source design systems and must be
preserved.

**Spacing.** 2/4/5/6/7/8/9/10/11/12/14/16/18/20/22/26/28/34/40/44px, with `clamp()` at page
padding.

**Shadows.** Tiles `inset 0 1px 0 <tile-hi>, inset 0 -2px 0 <tile-lo>, 0 4px 8px rgba(0,0,0,.42)`.
Modals `0 26px 60px rgba(0,0,0,.6)`. Toasts `0 12px 30px rgba(0,0,0,.45)`.

---

## Assets

No binary assets. Everything is CSS, type and layout.

**Fonts** (Google Fonts): Space Grotesk 400–700, IBM Plex Sans 400–600, Inter 400–700,
Caprasimo 400, Figtree 400–800. Self-host these for production.

**Icons.** The design deliberately uses no icon set — status is carried by borders, glyph
characters (✎ 🔒 ✓) and type. If you introduce icons, the source systems specify Phosphor
(duotone) for Broadsheet-family and Nocturne, and Lucide at stroke-width 2.75 for Organic.

**Imagery.** None. If you add photography, Midnight expects a `mix-blend-mode: lighten`
treatment on dark-shot subjects; Sandbar expects a desaturated, lifted "washed" treatment.

---

## Files in this bundle

| File | What it is |
|---|---|
| `Rack Five.dc.html` | The playable design reference. Open in a browser. |
| `tokens.css` | All three themes as CSS custom properties, plus the base reset and keyframes. |
| `ruleset.json` | The versioned gameplay configuration object. |
| `source-docs/rack-five-rulebook-v3.md` | Rule authority. |
| `source-docs/rack-five-product-requirements-document.md` | Product scope authority. |
| `source-docs/rack-five-quickstart.md` | Player-facing help copy. |
| `source-docs/rack-fire-design-instructions.md` | The original design brief. |

---

## Known gaps in the prototype

These are deliberate — the mockup proves the flow, not the shipping systems.

1. **Dictionary** is a ~1,300-word demo subset; Strict mode is off by default.
2. **Gameplay Lab** sliders are wired to the live engine — budget, refresh count and cap,
   upper-bonus threshold and value, Jumbo length and multiplier, hint cost and count, the turn
   timers, Word Bank method, the tile-value multipliers, and the experimental variant flags all
   reach `effectiveRuleset()`. Of the four variants, Tile Value Scoring and Blind Declaration
   change scoring today; Carry-Over and Power Letters are still flags only.
3. **Leaderboards** persist completed entries locally and, on Codex Sites, in a shared D1-backed board. Static hosts fall back to a clearly labeled per-device board. Clicking an entry opens its stored recap.
4. **Autosave, action log and playtest export** are stubbed. The data shapes are documented
   above and must be built for real.
5. **Tutorial** (the scripted first turn) and the **playtest intent prompts** are specified in
   the PRD but not built.
6. **Tile distribution and values** use the familiar 100-tile English set for prototyping. A
   shipped product needs its own approved distribution and value table.

## Open product decisions

Carried forward from PRD §26, unresolved and needing an owner before implementation:
official digital dictionary and licensing; commercial tile distribution and values; the
short-game upper bonus; whether hints can be bought below the full cost; whether intent
prompts appear in public play; and whether interrupted timed runs stay leaderboard-eligible.
