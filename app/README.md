# Rack Five — Solo Arcade (Phase 1)

A playable implementation of the Rack Five design handoff. Five word slots instead of five dice:
each word's **length** becomes its **rank**, and those five ranks fill a 13-category Yahtzee-style
scorecard.

> Do I build the best word I can, or the word length my scorecard needs?

**Authorities.** Gameplay follows `../source-docs/rack-five-rulebook-v3.md`. Scope, screens and
settings follow `../source-docs/rack-five-product-requirements-document.md`. Player-facing copy comes
from `../source-docs/rack-five-quickstart.md`. Look, layout and interaction follow the design bundle
in the parent folder (`../README.md`, `../tokens.css`, `../Rack Five.dc.html`).

---

## Running it

The app is plain ES modules with **no build step and no runtime dependencies**, but ES modules need
to be served over http rather than opened from the file system.

```bash
serve.cmd
```

That starts a dependency-free PowerShell static server on <http://localhost:8123/> and opens it.
Use `serve.cmd -Port 9000` for a different port, or set `$env:PORT`. Any static host works just as
well — copy the `app/` folder to Netlify, GitHub Pages, S3, nginx, whatever. There is nothing to
compile.

Engine tests live at <http://localhost:8123/tests/>.

## Hosting it

Serve the contents of `app/` as the site root, or under any path — every reference is relative, so
`example.com/rack-five/` works without configuration.

Two things a host has to get right:

- **`.js` must be served as `text/javascript`.** The app is real ES modules and the browser refuses a
  module served as `text/plain` or `application/octet-stream`. Failure looks like a blank page.
- **`.txt` and `.woff2` must be served as-is.** The dictionary is a 1.7 MB `.txt` (about 450 KB
  gzipped — worth enabling compression and a long `Cache-Control`, since it is fetched once per
  session at boot). The fonts are self-hosted `.woff2`.

`/api/leaderboard` is **optional**. Where it does not exist the app notices the 404 once, stops
asking, and the leaderboard becomes per-device — which is the expected state on a static host. Tell
testers, or cross-device scores look broken. Where it *does* exist, note that this build has no
authentication on it: any visitor can overwrite or clear the shared board, and the Gameplay Lab is
equally open. Both belong behind a credential before the board carries anything worth keeping.

## What is real

Everything below is implemented, not mocked:

- **Seeded deterministic generation.** FNV-1a over `seed + ':' + turnNo` into mulberry32, Fisher-Yates
  over the full 100-tile bag. The first `budget` tiles are the rack, the next 20 are the ordered
  replacement queue. The same `(seed, difficulty)` always deals identical racks *and* identical
  replacement luck. `Math.random()` is used only to mint a new share code, never during play.
- **The budget invariant**, asserted after every action: `loose + build bar + letters in words === budget`.
- **The scorecard evaluator** with the rulebook's qualification rules written down, including
  "a Rack Five does not qualify as a Full House" and "rank 0 never satisfies any pattern".
- **Provisional → permanent** commitment, on refresh and on scoring.
- **Word Bank, Jumbo, hints, blanks, rank-0 empty slots, per-difficulty upper bonus.**
- **A real dictionary.** ENABLE, 172,727 words of three letters or more, bundled and public domain.
  Strict checking is **on** by default.
- **Autosave and resume.** Every action writes to `localStorage`. Leaving the board for Settings, the
  Lab or How to Play never restarts a run — the nav item becomes "Resume game" and the clock stops
  while you are away. Reloading the browser restores the exact turn state.
- **A replayable action log** per run, and **playtest export** as JSON plus a turn-level CSV.
- **Local leaderboards**, separated by difficulty, filterable by timing, with Custom runs kept on
  their own board.
- **The Gameplay Lab**, whose sliders feed the live engine.
- **Sound effects**, synthesised with the Web Audio API — no binary assets — plus haptics.
- **Three themes** (Feltwork, Midnight, Sandbar), persisted, with the source design systems' distinct
  button treatments preserved: brass gradient, accent outline on transparent, terracotta pill.

## What is deliberately not built

Matching the handoff's "Known gaps", and honest about it in the UI:

| Area | State |
|---|---|
| Daily Challenge, Multiplayer, Friends board, Short game | Visible, disabled, labelled "Coming soon". They start no workflow. |
| Scripted first-turn tutorial | Not built. The Settings row resets the flag the tutorial will read. |
| TWL06 / NWL and Collins / SOWPODS | Listed in Settings with descriptions and marked "File not included" — both are licensed. Drop `twl06.txt` or `sowpods.txt` into `data/dictionaries/` and they light up. |
| Server, live opponents, score verification | None. Phase 1 is local only. The action log and run identity exist so verification can be added later without a rewrite. |
| Tile distribution and values | The familiar 100-tile English set, fine for prototyping. A shipped product needs its own approved table (PRD §26.2). |

Two experimental variants — **Carry-Over** and **Power Letters** — are wired but only lightly
exercised; **Blind Declaration** and **Chance Scores Tile Value** are wired end to end. All four are
off by default and none are standard Phase 1 rules.

## Layout of the code

```
app/
├── index.html            import map, stylesheets, mount point
├── serve.ps1 / serve.cmd dependency-free static server
├── assets/fonts/         self-hosted Space Grotesk, IBM Plex Sans, Inter, Caprasimo, Figtree
├── data/
│   ├── ruleset.json      the single authoritative gameplay configuration
│   └── dictionaries/     enable1.txt (bundled), demo-subset.txt
├── styles/
│   ├── tokens.css        the three themes, verbatim from the handoff
│   ├── base.css          reset, primitives, buttons, tiles, modals, toasts
│   ├── screens.css       home, setup, results, leaderboards, how to play, settings, lab
│   └── game.css          HUD, rack, build bar, slots, scorecard, responsive
├── src/
│   ├── engine/           pure logic, no DOM
│   │   ├── ruleset.js    load, freeze, Lab overlay, structural safeguards
│   │   ├── rng.js        FNV-1a, mulberry32, seed codes
│   │   ├── bag.js        the 100-tile bag and the per-turn deal
│   │   ├── rank.js       length → rank
│   │   ├── categories.js the 13 categories and their help copy
│   │   ├── evaluator.js  what every category pays, plus plain-language results
│   │   ├── validation.js placement rules, in the order failures should be reported
│   │   ├── hints.js      dictionary-filtered candidate search
│   │   ├── dictionary.js the registry, loader and lookup
│   │   └── invariant.js  the budget assertion
│   ├── state/            store, actions, persistence, action log, export
│   ├── audio/sfx.js      synthesised sound and haptics
│   └── ui/               Preact + htm components, one file per screen
├── vendor/               preact + htm, self-hosted, no CDN at runtime
└── tests/                engine tests, open in a browser
```

### Why Preact and htm

No Node toolchain was available and none is needed. `htm` tagged templates give real components,
keyed reconciliation and controlled inputs without JSX or a bundler, and the whole vendored payload
is 16 KB. Moving to React later is `preact/compat` plus a bundler; nothing in `src/engine` or
`src/state` touches the view layer.

## The data model

`players` is an array of length one and `matchId` is null — the entire multiplayer stub, exactly as
the rulebook asks. Nothing reads `players[0]` outside the `me(run)` helper.

```js
run = {
  runId, seed, difficulty, budget, timing, gameLength, mode:'solo', matchId:null,
  isCustom, rulesetVersion, rngVersion, dictionaryId, dictionaryVersion,
  tileDistributionId, tileDistributionVersion, ruleset,
  players: [playerState], turnNo, history, log, interrupted,
  startedAt, completedAt, finalScore
}

turn = {
  turnNo, loose[], build[], slots[5], discarded[], queue[], queueIndex,
  refreshesLeft, secondsLeft, expired, mode:'build'|'refresh', refreshSel[],
  hintWord, error, intendedCategory, postRefreshCategory, startedAt
}

slot = { word, letters:[{c,blank}], rank, tileValue, provisional, tiles[] }
```

## Interaction notes

- **Tap and drag both work, and tap is never the only-way-round.** Dragging is pointer-event driven
  with window-level listeners, because `dragstart` never fires on touch and a re-render mid-drag must
  not strand the gesture. A press that never travels 8px is a tap; a real drag swallows the click the
  browser fires afterwards. Loose tiles reorder by dragging or drop onto the Build Bar; Build Bar
  tiles reorder in place. On touch the rack splits the gesture with its own scroller — sideways drags
  reorder, vertical drags scroll the rack — because a rack that cannot be scrolled to its last row is
  worse than one that only reorders in one axis. The Build Bar does not scroll, so it takes both axes.
- **Keyboard.** Every control is a real button. On the board, type letters to build (Shift+letter
  takes a blank), Enter places, Backspace undoes, Escape clears.
- **Placing a word never opens a dialog** — words are provisional anyway. A three-second undo banner
  covers the misplaced tap. **Refreshing does** open a warning, because it is the only genuinely
  irreversible click in the turn, and it names both effects and the tile count.
- **Scoring is a deliberate two-step.** Tapping a row or a "Take now" chip only selects; the footer
  confirms. Any open category can be taken at any time — a player who cannot find more words must
  always be able to advance.
- **The scorecard is never collapsible.** Above 900px it sits beside the board (docked right) and
  each column scrolls inside itself, so the page never scrolls to reach it. Below 900px the columns
  stack and a jump bar keeps the scorecard one tap away — unless the viewport is also wider than it is
  tall, which means a phone held sideways. There, stacking would push the Build Bar off the bottom of
  the screen, so the columns stay side by side and the vertical rhythm compresses instead.
- **Contextual help** sits beside the budget, refresh, rank strip, Word Bank, Jumbo, slot status,
  the clock and the scorecard.

## Accessibility

Keyboard operation for every gameplay action; screen-reader labels on every tile including value and
status; announcements when a word is placed, when words become permanent and when the timer expires;
non-colour status indicators (dashed vs solid borders, ✎ and 🔒 glyphs); high-contrast and larger-label
options; reduced motion honoured from both the setting and the OS; touch targets never below 44px.
Every text colour in `tokens.css` clears 4.5:1 in all three themes.

## Open product decisions

Carried forward from PRD §26 and still needing an owner: the official digital dictionary and its
licensing; the commercial tile distribution and value table; the short-game upper bonus; whether
hints can be bought below full cost (this build requires the full cost, per the PRD's
recommendation); whether intent prompts appear in public play (this build puts them behind the
Playtest instrumentation setting); and whether interrupted timed runs stay leaderboard eligible
(this build keeps them and flags them).
