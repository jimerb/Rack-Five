# RACK FIVE
## Product Requirements Document

**Product stage:** Phase 1 prototype and first playable release  
**Primary mode:** Solo Arcade  
**Rule authority:** `rack-five-rulebook-v3.md`  
**PRD version:** 1.0  
**Status:** Ready for design mockup and implementation planning

---

## 1. Purpose of This Document

This PRD translates the final Rack Five rulebook into a digital product that can be designed, built, tested, and adjusted without rewriting the core game.

The rulebook remains the authority for gameplay. This document defines:

- What ships in the first version
- How a player starts, plays, scores, and finishes a game
- The screens and interactions required by the design mockup
- Player-facing gameplay options
- Features shown as coming soon
- How game rules and balance values are configured
- What playtest data must be captured
- The technical foundation required for seeded replays, Daily Challenges, and future multiplayer
- Acceptance criteria for the first version

The first version is meant to prove that Rack Five is fun for a complete 13-round game and that Easy, Medium, and Hard create meaningfully different levels of control.

---

## 2. Product Summary

Rack Five is a word game built around the familiar structure of Yahtzee.

Instead of rolling five dice, the player fills five word slots. Each word becomes a rank based on its length:

| Word length | Rank |
|---|---:|
| 3 letters | 1 |
| 4 letters | 2 |
| 5 letters | 3 |
| 6 letters | 4 |
| 7 letters | 5 |
| 8 or more letters | 6 |

The player uses a visible pool of letter tiles to create five words, may refresh loose tiles twice, and scores the resulting five ranks in one open scorecard category.

The central decision is:

> Do I build the best word I can, or the word length my scorecard needs?

The product must keep that decision visible and understandable throughout play.

---

## 3. Product Goals

### 3.1 Primary goals

1. Deliver a complete and enjoyable solo Rack Five game using all 13 scorecard categories.
2. Make word building, tile scarcity, refreshing, commitment, and scoring easy to understand.
3. Support Easy, Medium, and Hard through configurable letter budgets.
4. Determine whether rack size meaningfully changes a player's ability to manufacture an intended category.
5. Store deterministic seeds and action logs so a completed game can be replayed and verified.
6. Establish a foundation for Daily Challenges and live same-rack multiplayer without building either feature in Phase 1.
7. Keep important gameplay values configurable so balance can change after testing without rewriting game logic.

### 3.2 Experience goals

The game should create four recurring pleasures:

1. Finding words in a rich pool of letters.
2. Choosing the exact word lengths needed for a scorecard pattern.
3. Deciding when to refresh, knowing that every placed word will become permanent.
4. Deciding where an imperfect hand belongs on the scorecard.

### 3.3 Questions Phase 1 must answer

- Do 13 rounds remain tense and enjoyable?
- Do Easy, Medium, and Hard produce measurably different intended-category success rates?
- Does the refresh decision genuinely redirect players?
- Does the Word Bank add interest, or does each hand feel like one good word and four chores?
- Does the scorecard remain the main story of the final score?
- Is a three-minute turn comfortable?
- Does a full game regularly exceed an acceptable play time?
- Are rare letters interesting opportunities or immediate discard choices?
- How large is the performance gap between casual and experienced word players?

---

## 4. Non-Goals for Phase 1

The first version will not include:

- Live multiplayer
- Daily Challenge competition
- Friends leaderboards
- Shared Rack race mode
- Steal mode
- A computer opponent
- A solver that finds an optimal five-word hand
- Carry-over tiles
- Power Letter swaps
- Blind Declaration as a standard rule
- Tile-value Chance as a standard rule
- A theoretical maximum score
- A finalized commercial tile distribution or commercial dictionary decision

Daily Challenge, Multiplayer, and Friends will be visible as disabled future areas where prescribed by the rulebook.

---

## 5. Target Players

### 5.1 Primary audience

- Adults who enjoy word games
- Players familiar with Yahtzee-style scorecards
- Solo puzzle players
- Players who enjoy improving personal high scores
- Casual players who want a forgiving word game
- Experienced word players seeking a tighter optimization challenge

### 5.2 Skill range

The first version must support a broad vocabulary range without changing the underlying scoring rules:

- Easy supplies more letters and more possible solutions.
- Medium is the standard game.
- Hard supplies fewer letters and tighter decisions.
- Relaxed timing supports learning and puzzle play.
- Blitz timing supports experienced and speed-oriented players.
- Hints provide limited help at a defined cost.

---

## 6. Phase 1 Scope

### 6.1 Included

- Solo Arcade mode
- Full 13-round game
- Easy, Medium, and Hard
- Relaxed, Standard, and Blitz timing
- Deterministic seeded tile generation
- Replay a completed seed
- Enter and play a shared seed
- Local high-score boards
- Separate leaderboard views by difficulty
- Timing-mode filtering or separation within each difficulty
- Word validation
- Tile availability validation
- Provisional word placement
- Permanent commitment on refresh or scoring
- Two refreshes of up to 10 loose tiles each
- Complete scorecard evaluation
- Word Bank
- Jumbo bonus
- Hints
- Blanks
- Incomplete-hand handling
- Tutorial and How to Play
- Autosave and resume
- Results breakdown
- Share This Seed
- Playtest measurement and local analytics logging
- Exportable playtest data
- Advanced Gameplay settings for controlled custom testing
- Disabled Daily Challenge and Multiplayer mode entries labeled Coming soon
- Disabled Friends leaderboard tab
- Themes For Gameplay: Dark mode, different styles as chosen in the settings.  Dark themes are important for users who like to play in dark mode.  This should be something that is savable. 

### 6.2 Deferred

#### Phase 2: Daily Challenge

- One seed per day per difficulty
- Identical racks and replacement queues for all players
- Asynchronous play
- Shared daily leaderboards
- Server-side score verification from seed and action log

#### Phase 3: Live Simultaneous Same Rack

- All players receive the same seed
- Independent building, refreshing, and scoring
- Identical initial racks and replacement luck
- Synchronized rounds and clocks
- Reconnection handling
- Round reveal
- Match results

### 6.3 Visible coming-soon features

The design must show:

- **Solo:** enabled
- **Daily Challenge:** disabled, labeled `Coming soon`
- **Multiplayer:** disabled, labeled `Coming soon`
- **Friends leaderboard:** disabled

The disabled areas may be selected to display a short explanation, but they must not begin incomplete workflows.

Recommended messages:

> Daily Challenge is coming soon. Everyone will play the same daily letters and compare scores.

> Multiplayer is coming soon. Players will solve identical racks independently and reveal their results together.

---

## 7. Information Architecture

### 7.1 Primary navigation

1. Home
2. Play
3. Leaderboards
4. How to Play
5. Settings

### 7.2 Home screen

The Home screen should provide:

- Game logo and title
- `Play Solo` primary action
- `Play a Seed` secondary action
- `Resume Game` when an unfinished run exists
- Daily Challenge card, disabled and labeled Coming soon
- Multiplayer card, disabled and labeled Coming soon
- Personal-best summary
- How to Play
- Settings

### 7.3 Play setup screen

The setup screen must allow the player to choose:

- Difficulty
- Timing
- Full game
- Optional seed entry
- Standard or Custom rules

Defaults:

- Difficulty: Medium
- Timing: Standard
- Game length: Full
- Rules: Standard
- Seed: Automatically generated

### 7.4 Gameplay screen

The gameplay screen must contain:

- Difficulty
- Turn number
- Timer or Untimed label
- Permanent budget summary
- Refresh count and refresh limit
- Loose tile rack
- Tile sorting controls
- Build bar
- Place and Undo controls
- Five word slots
- Provisional or permanent status for every placed word
- Scorecard access
- Current Word Bank
- Jumbo status
- Hint access
- Pause or menu access

### 7.5 Results screen

The Results screen must contain:

- Final score
- Scorecard subtotal
- Upper bonus
- Word Bank subtotal
- Jumbo bonus
- Hint costs
- Completed scorecard
- Difficulty
- Timing mode
- Seed
- Ruleset version
- Personal-best result when applicable
- Leaderboard placement
- `Replay This Run`
- `Share This Seed`
- `Play Another`
- `View Turn Breakdown`

---

## 8. How to Play

This section must appear in the app as a readable rule guide and may also be used for onboarding.

### 8.1 Objective

Build five valid words each turn. Convert each word's length into a rank, then score the five ranks in one open scorecard category.

After 13 turns, the player with the highest total would win. Phase 1 is solo, so the goal is to beat personal high scores.

### 8.2 Choose a difficulty

| Difficulty | Letters | Description |
|---|---:|---|
| Easy | 45 | More letters and more possible solutions |
| Medium | 40 | The standard game |
| Hard | 35 | Fewer letters and tighter decisions |

Hard mode permits every category, but a rank-6 Rack Five cannot be made because five 8-letter words require 40 letters.

### 8.3 Start a turn

At the start of each turn:

1. The complete 100-tile distribution is reset.
2. The game draws the number of tiles required by the selected difficulty.
3. All drawn tiles appear face up.
4. The player may inspect and sort them.

The total letter budget never increases during a turn.

> Loose letters + letters placed in words = the turn budget

### 8.4 Build words

1. Select loose letter tiles.
2. Arrange them in the Build Bar.
3. Use a blank as a chosen letter when needed.
4. Place a valid word into one of the five slots.

Words must contain at least three letters.

A newly placed word is provisional:

- It may be dismantled.
- Its letters may be reclaimed.
- Its order may be changed.
- Its blank assignments may be changed.

The exact same word cannot appear twice in one hand. The word may be used again on a later turn.

### 8.5 Refresh loose tiles

The player has two optional refreshes.

For each refresh:

1. Select up to 10 loose tiles.
2. Choose Refresh.
3. Review the warning that refreshing makes all placed words permanent.
4. Confirm the refresh.
5. The selected loose tiles are discarded.
6. The same number of replacement tiles is drawn.

Refreshing makes every provisional word permanent:

- The word can no longer be changed.
- Its letters cannot be reclaimed.
- Blank assignments become fixed.

The refresh never replaces letters already used in words and never increases the turn budget.

### 8.6 Complete the hand

Continue building until all five word slots are filled.

After the second refresh, the player may still build words from the remaining loose tiles. Those words stay provisional until scoring.

When the timer expires, any empty slot becomes rank 0.

In Relaxed mode, the player is expected to attempt all five slots. After both refreshes have been used, an incomplete hand may be finished with rank-0 empty slots after a warning.

### 8.7 Convert words to ranks

The app converts every word automatically:

| Word length | Rank |
|---|---:|
| 3 | 1 |
| 4 | 2 |
| 5 | 3 |
| 6 | 4 |
| 7 | 5 |
| 8 or more | 6 |

The player should never need to calculate rank manually.

### 8.8 Score the hand

Choose exactly one open scorecard category.

The app previews how many points the current hand will receive in every open category. If a hand does not satisfy a category, that category previews 0.

Selecting a category:

- Makes every remaining provisional word permanent
- Records the score
- Adds the hand's highest tile-value word to the Word Bank
- Awards Jumbo when applicable
- Ends the turn

If no category is useful, the player must score a zero in one open category.

### 8.9 Word Bank

Only the highest tile-value word in each hand enters the Word Bank.

- Blanks are worth 0.
- Only one word is banked each turn.
- The Word Bank is added to the final score.
- Hint costs are deducted from the Word Bank.
- The Word Bank cannot be negative.

### 8.10 Jumbo

The first word of 9 or more letters played during a game earns:

> 3 points for every letter

Examples:

- 9 letters: 27 points
- 11 letters: 33 points
- 13 letters: 39 points

Jumbo may be earned only once per game and occupies no scorecard category.

### 8.11 Hints

A hint:

- Costs 3 Word Bank points
- Reveals one valid word of a length chosen by the player
- Uses only currently loose tiles
- Does not promise an optimal word
- Does not promise that the remaining letters can complete the hand
- May be used no more than twice per game

The standard implementation must require at least 3 available Word Bank points before purchasing a hint. This avoids negative balances and prevents free hints at a zero balance.

### 8.12 Finish the game

The full game ends after all 13 scorecard categories have been used.

Final score:

> Scorecard + Upper Bonus + Word Bank + Jumbo bonus

The Results screen shows the complete breakdown and records the score on the appropriate local leaderboard.

---

## 9. Scorecard Requirements

### 9.1 Upper section

| Category | Qualifying words | Score |
|---|---|---:|
| Ones | Rank 1, 3-letter words | 1 per qualifying word |
| Twos | Rank 2, 4-letter words | 2 per qualifying word |
| Threes | Rank 3, 5-letter words | 3 per qualifying word |
| Fours | Rank 4, 6-letter words | 4 per qualifying word |
| Fives | Rank 5, 7-letter words | 5 per qualifying word |
| Sixes | Rank 6, 8-or-more-letter words | 6 per qualifying word |

### 9.2 Upper bonus

Initial standard configuration:

- Threshold: 63
- Bonus: 35

The threshold is provisional and must be configurable separately for Easy, Medium, and Hard.

The target after sufficient testing is an upper-bonus earn rate of approximately 25 to 40 percent among competent players.

### 9.3 Lower section

| Category | Requirement | Score |
|---|---|---:|
| Three of a Kind | At least 3 words of one rank | Sum of all 5 ranks |
| Four of a Kind | At least 4 words of one rank | Sum of all 5 ranks |
| Full House | Exactly two distinct ranks in a 3-and-2 split | 25 |
| Small Straight | 4 distinct consecutive nonzero ranks | 30 |
| Large Straight | 5 distinct consecutive nonzero ranks | 40 |
| Chance | Any hand | Sum of all 5 ranks |
| Rack Five | All 5 words have the same rank | 10 times that rank |

### 9.4 Qualification rules

- Four of a Kind qualifies as Three of a Kind.
- Rack Five qualifies as Three of a Kind.
- Rack Five qualifies as Four of a Kind.
- Rack Five does not qualify as a Full House.
- The fifth rank in a Small Straight may be anything, including a duplicate or rank 0.
- A Large Straight requires five distinct consecutive nonzero ranks.
- Rank 0 never helps satisfy a pattern.

### 9.5 Rack Five values

| Hand | Score | Availability |
|---|---:|---|
| Five 3-letter words | 10 | Easy, Medium, Hard |
| Five 4-letter words | 20 | Easy, Medium, Hard |
| Five 5-letter words | 30 | Easy, Medium, Hard |
| Five 6-letter words | 40 | Easy, Medium, Hard |
| Five 7-letter words | 50 | Easy, Medium, Hard |
| Five 8-or-more-letter words | 60 | Easy, Medium |

---

## 10. Game Options

### 10.1 Standard player-facing options

#### Difficulty

- Easy: 45 letters
- Medium: 40 letters, default
- Hard: 35 letters

#### Timing

- Relaxed: Untimed
- Standard: 3 minutes per turn, default
- Blitz: 90 seconds per turn

#### Game length

- Full: 13 rounds, available in Phase 1
- Short: 6 rounds, deferred until the upper-bonus treatment is finalized

If Short Game appears in the mockup, it must be disabled and labeled Coming soon. It may instead remain hidden until the open scoring decision is resolved.

When Short Game is enabled later, its six categories must be selected using the rulebook's structured draw:

1. One random low upper category: Ones or Twos
2. One random middle upper category: Threes or Fours
3. One random high upper category: Fives or Sixes
4. Chance, always included
5. Two random pattern categories chosen from Three of a Kind, Four of a Kind, Full House, Small Straight, Large Straight, and Rack Five

The Short Game must not use the standard 63-point upper bonus. The product owner must decide whether it has no upper bonus or a separately configured threshold before the mode is enabled.

#### Dictionary

The rulebook permits TWL or SOWPODS.

Before development is finalized, the product owner must choose one official default dictionary for standard leaderboard runs. If both are selectable:

- The selected dictionary must be displayed before play.
- The dictionary ID and version must be stored with the run.
- Leaderboard entries must identify the dictionary.
- Runs using different dictionaries must not be presented as perfectly equivalent.

#### Seed

- Random seed, default
- Enter a seed
- Replay a completed seed
- Share a seed

### 10.2 Presentation and accessibility options

- Default rack sorting: Draw order, A-Z, or tile value
- Sound effects: On or Off
- Music: On or Off, if music is included
- Haptics: On or Off
- Reduced motion
- High-contrast tiles
- Larger tile labels
- Color-blind-safe status treatment
- Screen reader support
- Tutorial prompts: On, Off, or Reset

---

## 11. Advanced Gameplay and Tuning

### 11.1 Purpose

Rack Five is still proving its gameplay. Important values must be adjustable without editing scoring functions or rebuilding interface logic.

The product should provide two levels of tuning:

1. **Standard Rules:** Fixed, leaderboard-eligible settings defined by the current ruleset.
2. **Advanced Gameplay:** Custom experimental settings for designers, testers, and curious players.

Any Advanced Gameplay change creates a **Custom Run**:

- Clearly labeled Custom
- Excluded from standard leaderboards
- Still saved locally
- Still replayable if its complete configuration is preserved
- Eligible for playtest export

### 11.2 Advanced Gameplay screen

Location:

> Settings > Advanced > Gameplay Lab

The screen must explain:

> These controls are for testing game balance. Changing them creates a Custom Run and removes the score from standard leaderboards.

Controls should be grouped by what they affect.

#### Letter pressure

- Turn budget
- Refresh count
- Maximum tiles per refresh
- Minimum word length
- Number of blanks in distribution
- Tile distribution profile
- Tile-value profile

#### Scoring pressure

- Upper-bonus threshold by difficulty
- Upper-bonus value
- Full House score
- Small Straight score
- Large Straight score
- Rack Five multiplier
- Word Bank method
- Word Bank percentage or cap
- Jumbo minimum length
- Jumbo points per letter

#### Assistance

- Maximum hints per game
- Hint cost
- Allow hints when Word Bank has fewer than the full cost
- Default tile sorting

#### Pace

- Standard turn duration
- Blitz turn duration
- Timer warning threshold
- Full-game round count
- Short-game enablement

#### Experimental variants

These switches must default Off and must not ship as standard Phase 1 rules:

- **Blind Declaration:** The player names a target category before the rack is revealed. The declared category scores at full value and any other category scores at half value.
- **Chance Scores Tile Value:** Chance scores the summed tile value of all five words instead of the rank sum.
- **Carry-Over:** The player may retain up to five unspent tiles for the next turn.
- **Power Letters:** The first permanent word each turn containing a real J, Q, X, or Z earns one free single-tile swap. One loose tile leaves and one replacement enters, so the budget does not change.

### 11.3 Safe reset

Advanced Gameplay must include:

- `Reset to Standard Rules`
- Current ruleset name and version
- Summary of values changed from standard
- Confirmation before leaving with unsaved changes

### 11.4 Configuration requirements

Gameplay numbers must come from a versioned configuration object, not scattered constants.

Illustrative configuration:

```json
{
  "rulesetVersion": "phase1.0",
  "slotCount": 5,
  "minimumWordLength": 3,
  "rankBands": [
    { "minimumLength": 3, "maximumLength": 3, "rank": 1 },
    { "minimumLength": 4, "maximumLength": 4, "rank": 2 },
    { "minimumLength": 5, "maximumLength": 5, "rank": 3 },
    { "minimumLength": 6, "maximumLength": 6, "rank": 4 },
    { "minimumLength": 7, "maximumLength": 7, "rank": 5 },
    { "minimumLength": 8, "maximumLength": null, "rank": 6 }
  ],
  "difficulty": {
    "easy": { "budget": 45, "upperBonusThreshold": 63 },
    "medium": { "budget": 40, "upperBonusThreshold": 63 },
    "hard": { "budget": 35, "upperBonusThreshold": 63 }
  },
  "refresh": {
    "count": 2,
    "maximumTiles": 10,
    "commitsPlacedWords": true
  },
  "timingSeconds": {
    "relaxed": null,
    "standard": 180,
    "blitz": 90
  },
  "upperBonusPoints": 35,
  "wordBank": {
    "method": "highest_word_each_turn",
    "hintCost": 3,
    "maximumHints": 2
  },
  "jumbo": {
    "minimumLength": 9,
    "pointsPerLetter": 3,
    "maximumAwardsPerGame": 1
  },
  "rackFiveMultiplier": 10
}
```

The exact configuration format may change, but the logic must read from one authoritative ruleset.

### 11.5 Structural safeguards

Some values affect the scorecard's basic meaning and should not be exposed casually:

- Slot count
- Number of ranks
- Rank-to-length mapping
- Scorecard category definitions

These may remain configurable for developers but hidden from the normal Gameplay Lab. Changing them requires a custom ruleset version and may require different interface layouts.

The following rules must not be offered as tuning controls:

- A separate rare-letter scorecard category
- Doubling an entire word for containing X or Z
- Allowing a rare letter to act as a blank
- Granting letters beyond the configured turn budget

---

## 12. Detailed Gameplay Flow

### 12.1 Start a new run

1. Player selects Solo.
2. Player chooses difficulty.
3. Player chooses timing.
4. Player leaves the generated seed or enters a shared seed.
5. The setup screen summarizes the selected rules.
6. Player selects Start Game.
7. The run is created with a ruleset version, dictionary version, tile-distribution version, seed, and selected options.

### 12.2 Turn initialization

1. Derive the turn's opening rack from the run seed.
2. Derive the ordered replacement queue from the same seed.
3. Reset the scorecard interaction state.
4. Display the rack.
5. Allow inspection and sorting.
6. In Playtest Instrumentation mode, require the player to select the category they currently intend to pursue before tiles become buildable.
7. In Standard and Blitz, start the timer when the rack is revealed. Inspection and intent selection are part of the timed turn. Relaxed remains untimed.

### 12.3 Build a word

1. Player selects loose tiles.
2. Selected tiles move to the Build Bar or gain a selected state.
3. Player may change tile order.
4. If a blank is selected, the player assigns a letter.
5. The app displays current word length, rank, and tile value.
6. Player selects Place.
7. Validate dictionary membership.
8. Validate the tile multiset.
9. Validate minimum length.
10. Validate that the exact word is not already in another slot this turn.
11. If valid, place it provisionally.
12. If invalid, explain why and leave the player in the Build Bar.

### 12.4 Edit a provisional word

1. Player selects a provisional slot.
2. Its letters return to the Build Bar or loose rack.
3. Player edits, replaces, or removes the word.
4. Permanent words cannot be selected for editing.

### 12.5 Refresh

1. Player selects between 1 and the configured maximum number of loose tiles.
2. Refresh control shows the selected count.
3. Player selects Refresh.
4. Display an irreversible-action warning:

> Refreshing will make all placed words permanent. Replace 8 loose tiles?

5. If canceled, return to the turn unchanged.
6. If confirmed:
   - Mark every provisional slot permanent.
   - Move selected loose tiles to the turn discard.
   - Draw the same number of tiles from the replacement queue.
   - Advance the queue index.
   - Reduce refreshes remaining.
   - Assert the budget invariant.
7. After the first refresh, Playtest Instrumentation records the category now being considered.

### 12.6 Score a hand

1. When all five slots are filled, enable Score Hand.
2. After both refreshes are used, allow an incomplete hand to be finished with rank-0 empty slots after a warning.
3. Open the scorecard.
4. Display the points available in every open category.
5. Used categories are disabled and show their recorded scores.
6. Player selects an open category.
7. Display a final confirmation with the category and points.
8. On confirmation:
   - Make remaining provisional words permanent.
   - Convert empty slots to rank 0 if permitted.
   - Record the category score.
   - Determine the hand's highest tile-value word.
   - Add that word's value to the Word Bank.
   - Confirm that hint costs deducted when hints were purchased are reflected in the current Word Bank. Do not deduct them a second time.
   - Award Jumbo if a qualifying word becomes permanent and no previous permanent word has earned it.
   - Record turn analytics.
   - Autosave.
   - Continue to the next turn or Results.

### 12.7 Timer expiration

At zero:

1. Stop tile interaction.
2. Convert empty slots to rank 0.
3. Preserve valid placed words.
4. Open the scorecard automatically.
5. Require selection of one open category.
6. If the app is configured to auto-score on timeout, use only a separately defined experimental setting. Standard rules require player category selection.

### 12.8 Pause, background, and resume

Because a standard full game may last approximately 40 minutes, the game must autosave.

Autosave after:

- Every placed word
- Every provisional-word edit
- Every refresh
- Every hint
- Every scored turn
- App backgrounding

Phase 1 behavior:

- Relaxed games pause when the app is backgrounded.
- Standard and Blitz games preserve remaining time and record the interruption.
- On return, display a Resume overlay.
- Local scores may still be saved because Phase 1 leaderboards are local.
- The action log must record pauses so future competitive modes can apply stricter rules.

Only one unfinished run needs to be supported in Phase 1. Starting a new run while another exists requires a warning.

---

## 13. Seeded Generation and Replay

### 13.1 Requirement

Never use an unseeded random generator for gameplay.

Every standard run must be reproducible.

### 13.2 Run identity

The rulebook describes a run using `(seed, difficulty)`. Exact long-term replay also requires the versions of the systems that interpret that seed.

A reproducible run must store:

- Seed
- Difficulty
- Ruleset version
- Dictionary ID and version
- Tile-distribution ID and version
- Random-generator algorithm version
- Game length
- Timing mode

Without these versions, a future balance or dictionary update could cause the same seed to produce or validate a different run.

### 13.3 Per-turn generation

For every turn, the seed must deterministically produce:

- Opening rack matching the difficulty budget
- Ordered replacement queue of 20 tiles

The replacement queue contains exactly enough tiles for:

- Two refreshes
- Up to 10 tiles per refresh

Players who discard different tiles still draw from the same ordered future luck.

### 13.4 Share This Seed

The Phase 1 sharing feature must produce a playable run code, not merely expose a raw seed with no return path.

Shared data must include or resolve:

- Seed
- Difficulty
- Ruleset version
- Dictionary version
- Tile-distribution version

The player may:

- Copy the run code
- Use the platform share sheet
- Replay the run immediately
- Enter a run code from the Home screen

Suggested share text:

> Try my Rack Five run: Medium, Standard, seed RF-7K4M2. I scored 286.

If the exact historical ruleset is no longer available, the app must warn that the replay may differ or prevent an inaccurate replay.

### 13.5 Action log

Every run must maintain a replayable sequence of actions:

- Turn started
- Intent selected
- Tile selected or deselected
- Word placed
- Word edited or removed
- Blank assigned
- Refresh tiles selected
- Refresh confirmed
- Hint requested
- Word suggested
- Category considered after refresh
- Category selected
- Timer expired
- Pause or resume
- Turn completed
- Run completed

The action log supports:

- Replays
- Debugging
- Playtest analysis
- Future score verification
- Future multiplayer synchronization

---

## 14. Data Model

Illustrative model:

```js
const run = {
  runId,
  seed,
  rulesetVersion,
  rngVersion,
  dictionaryId,
  dictionaryVersion,
  tileDistributionId,
  tileDistributionVersion,
  difficulty: 'medium',
  budget: 40,
  gameLength: 'full',
  timing: 'standard',
  mode: 'solo',
  matchId: null,
  isCustom: false,
  players: [playerState],
  turns: [],
  startedAt,
  completedAt: null,
  finalScore: null
};

const playerState = {
  playerId: 'local-player',
  scorecard,
  wordBank: 0,
  jumboClaimed: false,
  jumboBonus: 0,
  hintsUsed: 0,
  hintPointsSpent: 0
};

const turnState = {
  turnNumber: 1,
  budget: 40,
  loose: [],
  slots: [null, null, null, null, null],
  discarded: [],
  replacementQueue: [],
  queueIndex: 0,
  refreshesLeft: 2,
  timerRemainingSeconds: 180,
  intendedCategory: null,
  postRefreshCategory: null,
  selectedScoreCategory: null,
  status: 'building'
};

const slot = {
  word: 'JUKEBOX',
  letters: ['J', 'U', 'K', 'E', 'B', 'O', 'X'],
  rank: 5,
  tileValue: 27,
  provisional: true,
  blanks: []
};

const turnRecord = {
  turnNumber,
  openingRack,
  replacementQueue,
  actions: [],
  finalSlots: [],
  ranks: [],
  categoryScored,
  categoryPoints,
  bankedWord,
  bankedWordValue,
  jumboAwarded,
  jumboLength,
  intendedCategory,
  postRefreshCategory,
  durationSeconds,
  refreshesUsed,
  tilesRefreshed,
  hintsUsed,
  emptySlots,
  feeling
};
```

Required invariant after every action:

```js
turnState.loose.length
  + sum(turnState.slots.filter(Boolean).map(slot => slot.word.length))
  === turnState.budget
```

The code must not assume the player array always contains exactly one player, even though Phase 1 creates only one.

---

## 15. Dictionary and Word Validation

### 15.1 Dictionary requirements

The engine must support a versioned dictionary loaded for fast membership checks.

Candidate prototype dictionaries:

- TWL
- SOWPODS
- ENABLE or TWL06 for development if licensing requires

The final commercial dictionary and distribution require separate licensing and product review.

### 15.2 Valid word rules

A word is valid when:

- It is present in the selected dictionary.
- It is at least three letters long.
- It can be built from the currently available loose tiles.
- It is not an exact duplicate of another word in the same hand.
- It is not classified as a proper noun.
- It is not an abbreviation.
- It is not hyphenated.
- It contains no apostrophe.

Plurals and ordinary inflections are valid when included in the selected dictionary.

### 15.3 Blanks

- Each standard distribution includes two blanks.
- A blank counts as one letter toward word length.
- A blank has tile value 0.
- The player must assign a letter before placing the word.
- The assignment may change while the word is provisional.
- The assignment becomes fixed when the word becomes permanent.
- Both blanks may appear in one word.
- A blank may not trigger any future Power Letter rule unless a later ruleset explicitly permits it.

### 15.4 Candidate generation for hints

Do not enumerate all subsets of the rack.

For a requested word length:

1. Filter dictionary candidates by length.
2. Compare each candidate's letter counts with the loose tile multiset.
3. Account for blanks.
4. Return one valid candidate.

The hint does not need to optimize the remaining hand.

---

## 16. Leaderboards

### 16.1 Phase 1 leaderboard

Phase 1 uses a local leaderboard.

Primary tabs:

- Easy
- Medium
- Hard
- Friends, disabled

Within each difficulty, scores must be filterable or separated by:

- Relaxed
- Standard
- Blitz

Timing modes should not be silently combined because an untimed player has much more opportunity to optimize than a Blitz player.

### 16.2 Leaderboard entry

Each entry stores:

- Final score
- Difficulty
- Timing
- Date
- Seed
- Ruleset version
- Dictionary version
- Scorecard subtotal
- Word Bank subtotal
- Jumbo bonus
- Upper bonus
- Game duration
- Interruption indicator
- Standard or Custom status

Custom runs never appear on standard leaderboards.

### 16.3 Sorting

Default:

1. Highest final score
2. Fewer hints used
3. Shorter game duration
4. Earlier completion date

The tie-break order must be configurable.

---

## 17. Playtest Instrumentation

### 17.1 Purpose

The first release must measure gameplay, not rely only on opinions.

Instrumentation must be controlled by a configuration flag:

- On for internal and structured playtests
- Optional or reduced for normal public solo play

### 17.2 Intended-category measurement

The sequence must be:

1. Reveal the opening rack.
2. Allow inspection.
3. Before building or refreshing, ask:

> What category are you aiming for right now?

4. Record the selection without committing the player to it.
5. After the first refresh, ask:

> What category are you considering now?

6. Record the category ultimately scored.

The intent prompt must explain:

> This does not lock your choice. It helps us understand how the game unfolds.

### 17.3 Turn feeling

In structured playtest mode, after scoring a turn, ask:

> How did that turn feel?

Choices:

- Obvious
- Tense
- Lucky
- Clever
- Frustrating

This should be a single-tap prompt and should not interrupt normal public play unless instrumentation is enabled.

### 17.4 Per-turn data

- Difficulty
- Budget
- Intended category after inspection
- Category considered after first refresh
- Category scored
- Refreshes used
- Number of tiles refreshed
- All five word lengths
- All five tile values
- Banked word and value
- Turn duration
- Hints used
- Empty slots
- Jumbo event
- Feeling

### 17.5 Per-game data

- Difficulty
- Timing
- Ruleset version
- Scorecard total
- Word Bank total
- Word Bank percentage of final score
- Jumbo earned and word length
- Category frequencies
- Rack Five frequency and rank
- Upper bonus earned
- Zeroed categories
- Total duration
- Interruptions
- Final score

### 17.6 Key derived measures

- Intended-category success rate by difficulty
- Category change rate after first refresh
- Average tiles refreshed
- Upper-bonus earn rate by difficulty
- Average Word Bank share of total score
- Average turn and game duration
- Hint usage rate
- Empty-slot frequency
- Rare-letter discard rate
- Frequency of five-short-word escape hands

### 17.7 Export

Phase 1 must offer:

> Settings > Advanced > Export Playtest Data

Export format:

- JSON for complete event and configuration data
- CSV summary for turn-level and game-level analysis

The export must exclude personal information not required for gameplay analysis.

---

## 18. Tutorial and Help

### 18.1 First-run tutorial

The tutorial should use a fixed seed and teach one action at a time:

1. Word length becomes rank.
2. Select tiles.
3. Build and place a provisional word.
4. Edit the provisional word.
5. Select loose tiles for refresh.
6. Explain that refreshing makes placed words permanent.
7. Complete five slots.
8. Preview scorecard categories.
9. Score the hand.
10. Explain Word Bank and Jumbo.

The tutorial run:

- Does not enter a leaderboard.
- Uses scripted guidance.
- May use a shortened single-turn example.
- Can be replayed from How to Play.

### 18.2 How to Play sections

- The basic idea
- Word length and rank
- Difficulty
- Letter budget
- Building provisional words
- Refreshing and permanence
- Scoring
- Scorecard categories
- Word Bank
- Jumbo
- Hints
- Blanks
- Timing
- Seeds and replay
- Coming-soon modes

### 18.3 Contextual help

Provide small help access near:

- Budget line
- Refresh control
- Word slot status
- Word Bank
- Jumbo
- Rank display
- Scorecard categories

Help should explain the rule without leaving the active game.

---

## 19. UX Requirements

### 19.1 Tile interaction

- Tap to select and deselect tiles.
- Selected tiles visibly move or change state.
- Dragging may be supported but cannot be the only interaction.
- Tile letters and values must remain readable.
- Blank tiles must display their assigned letter clearly.
- Loose, provisional, and permanent tiles must have distinct visual treatments.
- Status cannot rely on color alone.

### 19.2 Sorting

The player may sort loose tiles by:

- Original draw order
- Alphabetical order
- Tile value

Sorting changes presentation only. It must not change tile identity or seeded replay behavior.

### 19.3 Budget display

The budget must remain visible.

Recommended dynamic wording:

- Before any placed words: `40 loose`
- With provisional words: `27 loose + 13 placed = 40`
- After commitment: `27 loose + 13 permanent = 40`

If one compact term is preferred, `used` is safer than `committed` while provisional words can still be dismantled.

### 19.4 Refresh warning

The warning must explain both irreversible effects:

- Placed words become permanent.
- Selected loose tiles will be replaced.

The warning must show the number of selected tiles.

### 19.5 Scorecard preview

For every open category, show:

- Category name
- Current potential points
- Qualification status
- Short rule explanation on demand

Long press may open details, but tap and keyboard-accessible alternatives are required.

### 19.6 Feedback

Provide immediate feedback for:

- Valid word
- Invalid word and reason
- Duplicate word
- Missing letters
- Blank assignment needed
- Word placed provisionally
- Words made permanent
- Refresh completed
- Jumbo earned
- Best word banked
- Category scored
- Personal best

### 19.7 Responsive layout

The design must work on:

- Phone
- Tablet
- Desktop browser or desktop application

The loose rack may use different column counts by viewport, but must preserve all tiles and clear selection state.

---

## 20. Accessibility

The first version should include:

- Keyboard operation for all gameplay actions
- Screen reader labels for every tile, including value and status
- Screen reader announcement when a word becomes permanent
- Non-color indicators for loose, provisional, and permanent states
- High-contrast mode
- Scalable text
- Reduced motion
- Timer announcements at configurable thresholds
- Ability to mute sound and haptics
- Touch targets sized for tablet and phone use
- No gameplay information conveyed only through animation

The timer must not be the only indicator that time is nearly finished. Use visual and optional audio warnings.

---

## 21. Error and Edge-Case Handling

### 21.1 Invalid word

Explain the specific failure:

- Not in dictionary
- Too short
- Uses unavailable letters
- Duplicate within this hand
- Contains an unsupported form

### 21.2 Refresh errors

- Zero selected tiles: Refresh disabled.
- More than the configured maximum: prevent additional selection.
- Replacement queue unexpectedly exhausted: log a ruleset error and recover from the deterministic turn state.
- Refresh with provisional words: always show the permanence warning.

### 21.3 Incomplete hand

- Timer expiration converts empty slots to rank 0.
- Relaxed mode permits finishing incomplete only after both refreshes are unavailable.
- Score preview must reflect rank 0 accurately.

### 21.4 Seed errors

- Invalid format: explain and retain entered text.
- Unsupported historical ruleset: warn before play.
- Seed code with incompatible version: do not silently substitute current rules.

### 21.5 Autosave recovery

- Recover the latest valid action.
- Rebuild the state from seed and action log when possible.
- If recovery fails, preserve diagnostic data and offer to restart the run.

### 21.6 Dictionary updates

Do not change the dictionary version in the middle of an active run.

Historical replays must use their recorded version or clearly state that exact replay is unavailable.

---

## 22. Nonfunctional Requirements

### 22.1 Performance

- Tile selection response should feel immediate.
- Word validation should normally complete in under 100 milliseconds on the target device.
- Scorecard preview should update without visible delay.
- Sorting the rack should not interrupt interaction.
- Autosave should not block gameplay.

### 22.2 Reliability

- No action may violate the budget invariant.
- Seeded generation must return identical output across supported platforms.
- Scoring must be covered by automated tests for every category and overlap rule.
- The game must recover from app interruption without corrupting the run.

### 22.3 Privacy

- Phase 1 gameplay and leaderboard data may remain local.
- Playtest exports must contain no unnecessary personal data.
- Any future online analytics must be disclosed and follow applicable privacy requirements.

### 22.4 Security and verification

Phase 1 does not require server-authoritative scoring.

The data model and action log must make future verification possible by replaying:

- Seeded racks
- Replacement draws
- Player actions
- Word validation
- Score selection

---

## 23. Product Analytics and Success Criteria

### 23.1 Required Phase 1 evidence

Collect at least 30 complete standard-rules games per difficulty before changing the upper-bonus thresholds.

### 23.2 Primary success signals

- Intended-category success rate decreases meaningfully from Easy to Medium to Hard.
- Medium does not allow players to hit their intended category nearly every turn.
- The first refresh changes the considered category often enough to demonstrate real uncertainty.
- The scorecard remains a larger share of final score than the Word Bank.
- Standard games generally finish within an acceptable session length.
- Players complete a meaningful portion of started 13-round games.

### 23.3 Warning thresholds from the rulebook

- Intended-category rates are nearly identical across difficulties.
- Word Bank exceeds roughly 30 percent of final score.
- Medium intended-category success is nearly universal.
- Standard games regularly exceed one hour.
- Rare letters are discarded on sight.
- Five short words becomes a repetitive escape hatch.
- Experienced word players dominate casual players by hopeless margins.
- Players repeatedly describe the turn as one good word and four chores.

### 23.4 Initial tuning response

If difficulty does not meaningfully change manufacturability:

1. Keep budgets unchanged.
2. Reduce refresh maximum from 10 to 6.
3. Run the same measurement again.

Only one major gameplay variable should change per experiment.

---

## 24. Design Mockup Requirements

The design package should include the following states.

### 24.1 Home

- New player, no saved game
- Returning player with Resume Game
- Daily Challenge and Multiplayer disabled

### 24.2 Game setup

- Medium and Standard defaults
- Easy description
- Hard description and rank-6 Rack Five warning
- Seed entry
- Advanced Gameplay entry

### 24.3 Gameplay states

- Fresh rack
- Tiles selected in Build Bar
- Valid provisional word
- Invalid word
- Blank assignment
- Multiple provisional words
- Refresh tile selection
- Refresh permanence warning
- Words after becoming permanent
- After first refresh
- After second refresh
- Complete hand
- Incomplete timed-out hand with rank 0
- Scorecard preview
- Jumbo earned
- Hint purchase and result

### 24.4 Results

- Normal completion
- Personal best
- Score breakdown
- Seed sharing
- Turn history

### 24.5 Leaderboards

- Easy, Medium, and Hard tabs
- Relaxed, Standard, and Blitz filter
- Friends disabled
- Empty leaderboard
- Populated leaderboard

### 24.6 How to Play

- Rule index
- Rank conversion
- Refresh and permanence illustration
- Scorecard explanation

### 24.7 Settings

- General settings
- Accessibility
- Advanced Gameplay warning
- Gameplay Lab controls
- Export Playtest Data

---

## 25. Acceptance Criteria

### 25.1 New game

- A player can start a Solo full game using any of three difficulties and any of three timing modes.
- Medium and Standard are selected by default.
- The opening rack contains exactly the configured budget.

### 25.2 Budget

- The budget invariant holds after placement, editing, refresh, hint use, scoring, save, and resume.
- Refreshing never replaces word letters.
- No standard gameplay action increases the configured budget.

### 25.3 Words

- Valid words may be placed provisionally.
- Provisional words may be edited.
- Refreshing makes all provisional words permanent.
- Scoring makes all remaining provisional words permanent.
- Permanent words cannot be changed.
- Duplicate exact words in one hand are rejected.
- Blanks work as specified.

### 25.4 Refresh

- Each standard turn permits two refreshes.
- Each refresh permits 1 through 10 loose tiles.
- Replacement tiles come from the deterministic queue.
- A warning appears before commitment.

### 25.5 Scoring

- All upper and lower categories match the rulebook.
- Overlapping-hand qualifications match the rulebook.
- Rack Five scoring scales by rank.
- The Word Bank adds only the highest-value word per hand.
- Jumbo triggers once at the configured minimum length.
- Empty slots become rank 0 under the allowed conditions.

### 25.6 Hints

- A player may request a word of a chosen length.
- The suggestion can be formed from loose tiles.
- The hint costs 3 points.
- The Word Bank never becomes negative.
- No more than two hints may be used.

### 25.7 Seed and replay

- Replaying the same run identity produces the same opening racks and replacement queues.
- Share This Seed produces a code another local run can accept.
- The ruleset and content versions are preserved.

### 25.8 Save and resume

- An interrupted run can resume from the latest valid state.
- No tile, score, timer, or provisional status is lost.

### 25.9 Leaderboard

- Standard scores appear only under their difficulty.
- Timing modes can be separated or filtered.
- Custom scores do not enter standard leaderboards.

### 25.10 Instrumentation

- Structured playtest mode records the required intent, refresh, score, timing, word, and feeling data.
- Data can be exported.

---

## 26. Open Decisions Before Final Implementation

These items are not settled by the rulebook and should be resolved without changing its core gameplay.

### 26.1 Official digital dictionary

Choose the official standard dictionary and confirm its licensing. Decide whether alternate dictionaries are normal options or Custom Run options.

### 26.2 Commercial tile distribution and values

The prototype may use a familiar 100-tile distribution. A shipped commercial product requires its own approved distribution and value table.

### 26.3 Short-game upper bonus

The Short Game does not ship in the initial build.

Before enabling it, decide between:

- No upper bonus, recommended by the rulebook
- A separately configured short-game threshold

### 26.4 Hint purchase with fewer than 3 points

This PRD recommends disabling hint purchase until the Word Bank contains at least 3 points. Confirm this interpretation before implementation.

### 26.5 Intent prompts in public play

Decide whether intended-category and feeling prompts are:

- Required only in internal playtest builds
- Optional in public play
- Temporarily required during the first public testing period

### 26.6 Timed-run interruption policy

Phase 1 may pause locally when backgrounded, but future competitive modes will require a stricter policy. Confirm whether interrupted Standard and Blitz scores remain eligible for local high-score boards.

---

## 27. Recommended Build Order

1. Versioned gameplay configuration
2. Deterministic random generator
3. Length-to-rank conversion
4. Scorecard evaluator and automated scoring tests
5. Budget invariant and turn state machine
6. Dictionary and tile-subset validation
7. Provisional and permanent word flow
8. Refresh and replacement queue
9. Word Bank, Jumbo, and hint accounting
10. Seed and action-log persistence
11. Basic gameplay interface
12. Autosave and resume
13. Results and local leaderboards
14. Play a Seed and Share This Seed
15. Tutorial and How to Play
16. Playtest instrumentation and export
17. Advanced Gameplay controls
18. Disabled future-mode UI

---

## 28. Final Product Principle

Rack Five should remain easy to explain even while its internal rules are easy to tune.

The player sees:

- A pool of letters
- Five word slots
- Two refreshes
- A familiar scorecard
- One permanent budget

The development team sees:

- A versioned ruleset
- Deterministic seeds
- A replayable action log
- Adjustable balance values
- Measurable gameplay outcomes

The first release succeeds when it proves that finding, shaping, committing, and scoring five words remains tense across a complete game, and when the data shows whether changing the letter budget truly changes the experience.
