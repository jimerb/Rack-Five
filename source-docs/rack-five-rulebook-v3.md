# RACK FIVE
### A word game played like Yahtzee
**Version 3. Solo arcade first, multiplayer harness built in.**

---

## Changelog: V2 to V3

| Change | Reason |
|---|---|
| **Easy / Medium / Hard via rack size (45 / 40 / 35)** | Difficulty now adjusts the amount of possibility rather than adding penalties. More importantly, this is the experiment that answers the game's biggest unknown: how much control a large visible rack gives the player. |
| **Budget is no longer hardcoded at 40** | With three difficulties, the invariant becomes `loose + locked = turn budget`. The rules and the code both need to stop treating 40 as law. |
| **Phase 1 is single player arcade only** | Live multiplayer across devices is real backend work and it is not what needs proving right now. What needs proving is whether thirteen rounds stay tense. |
| **Deterministic seeded generation from day one** | This is the multiplayer harness. A run defined entirely by (seed, difficulty) gives you replays, daily challenges, fair same-rack matches, and score verification for free later. Costs nothing now. |
| **Locking is now two-stage: provisional, then permanent** | V2 demanded a confirmation dialog on every lock. That is 65 modal interruptions per game. Words now stay editable until you refresh or score, which is also a truer analogue to rearranging held dice. |
| **Hand qualification rules written down** | V2 never said whether a Rack Five counts as Four of a Kind, or whether a Full House needs two distinct ranks. Undefined rules produce arguments and inconsistent code. |
| **Short game uses a structured category draw** | Random 3-upper-and-3-lower could deal Ones/Twos/Threes (trivial) or Fours/Fives/Sixes (brutal), and could omit Chance entirely. |
| **Challenge clock pauses** | An opponent could challenge valid words purely to drain a timed player's clock. |
| **Hint cost fully specified** | "3 points off the Word Bank" left five unanswered questions. |
| **Intended-category measurement protocol fixed** | V2 said record intent "before each turn," which is ambiguous. If recorded before the rack is revealed it measures blind luck, not manufacturability, which is the opposite of what needs measuring. |

---

## 1. The Core Idea

Yahtzee gives you five dice. Rack Five gives you five **word slots**.

You don't roll for numbers. You dig them out of a pile of letters. The **length** of a word you build becomes its **rank**, and rank behaves exactly like a die face.

| Word length | Rank |
|---|---:|
| 3 letters | 1 |
| 4 letters | 2 |
| 5 letters | 3 |
| 6 letters | 4 |
| 7 letters | 5 |
| 8 or more letters | 6 |

Six ranks means every Yahtzee category survives untouched. Three of a kind is three words of equal length. A large straight is five words of consecutive lengths.

The central question:

> Do I build the best word I can, or the word length my scorecard needs?

Everything below protects that question.

---

## 2. Components

- **Letter bag:** 100 tiles, standard English word-game distribution and letter values, including 2 blanks.
- **The Rack:** face-up tiles, count set by difficulty.
- **Scorecard:** 13 categories.
- **Dictionary:** TWL or SOWPODS. Pick one and announce it.

*Commercial note: the familiar 100-tile distribution and point values are fine for prototyping. A shipped product needs its own distribution and value table, reviewed by someone qualified to review it.*

---

## 3. Difficulty and the Letter Budget

### The budget rule

**Each turn you have a fixed letter budget. It includes letters already committed to words.**

At all times:

> loose tiles + letters in words = the difficulty's turn budget

| Difficulty | Budget | Grid | Character |
|---|---:|---:|---|
| Easy | 45 | 5 x 9 | More letters, more possible solutions, room to be wrong |
| **Medium** | **40** | **5 x 8** | **The standard game. Default.** |
| Hard | 35 | 5 x 7 | Tighter allocation, fewer escape routes |

Five-letter steps, clean grids, one number to explain.

The interface displays this permanently:

> **Budget: 27 loose + 13 committed = 40**

Refreshes churn the loose pile only. They refill the loose pile to its current size, never to the full budget. Committed letters are never replaced during that turn.

### Why size is the right dial

A bigger pool does not hand out points. It hands out **options**. The player still has to see them and still has to pick the right lengths. A smaller pool makes every committed letter more dangerous: a 9-letter word eats 26 percent of a Hard budget and 20 percent of an Easy one.

This adjusts the game's single core resource instead of bolting on artificial handicaps.

### Honest note about Easy

Easy is not simply a gentler version of the same game. At 45 letters, the budget stops being the binding constraint on the biggest hands: five 8-letter words costs 40 and leaves 5 tiles spare. Scarcity pressure, which is the whole engine of the design, is measurably looser there. That is exactly what makes it easier, and it is worth knowing that Easy is testing a slightly different game rather than the same game at lower stakes.

There is also a labeling contradiction worth watching. Forty-five tiles offer more solutions but are more visually overwhelming to scan. A true beginner may find Easy harder to *read* even though it is more forgiving to *play*. Make alphabetical sorting prominent and describe the modes by what actually changes:

- Easy: more letters, more possible solutions
- Medium: the standard 40-letter game
- Hard: fewer letters, tighter decisions

### What each budget makes possible

| Hand | Tiles needed | Easy 45 | Medium 40 | Hard 35 |
|---|---:|:-:|:-:|:-:|
| Rack Five at rank 6 (five 8-letter) | 40 | yes | exactly | **no** |
| Rack Five at rank 5 (five 7-letter) | 35 | yes | yes | exactly |
| Large straight 2-3-4-5-6 | 30 | yes | yes | yes |
| Full house, three 8s and two 5s | 34 | yes | yes | yes |
| Three 8-letter words plus two 3-letter | 30 | yes | yes | yes |
| Longest single word in a complete hand | budget minus 12 | 33 | 28 | 23 |

Hard closes off exactly one thing: the rank-6 Rack Five. Every scorecard category remains reachable. Disclose it plainly in the mode description:

> Hard uses 35 letters. Every category remains available, but a rank-6 Rack Five cannot be made.

There is a pleasing symmetry here: a rank-5 Rack Five on Hard consumes the entire 35-tile budget, making it precisely as demanding as a rank-6 Rack Five is on Medium.

### Refreshes stay identical across difficulties

Two refreshes, up to 10 loose tiles each, on all three modes.

This means a refresh churns a larger share of a small rack (29 percent on Hard, 25 on Medium, 22 on Easy), which slightly cushions Hard. That is probably good, since Hard is already punished by its permanent budget.

**Do not vary rack size and refresh size at the same time.** You will not be able to attribute the result to either one. If Hard proves too forgiving after testing, cut its refresh cap then.

---

## 4. A Turn, Step by Step

Thirteen turns, one per scorecard category.

### Step 1: Reset and draw
All 100 tiles return to the bag and remix. Draw the budget face up.

Every turn starts from the same full distribution. Dice have no memory and neither does the bag.

### Step 2: Build words
Build valid words of 3 or more letters from loose tiles into your five slots.

A placed word is **provisional**. You may dismantle it, rearrange it, and reclaim its letters freely.

### Step 3: Refresh (twice, optional)
Each refresh discards **up to 10 loose tiles** and draws that many replacements.

**Refreshing makes every provisional word permanent.** Their letters are spent, cannot be reclaimed, and any blank assignments are fixed.

This is the commitment point, and it is the correct one. In Yahtzee you can rearrange which dice you're holding right up until the moment you actually reroll. Same here. The decision that costs you something is not placing a word, it is pulling the trigger on the refresh while some words are still unfinished.

### Step 4: Score
Fill all five slots, convert lengths to ranks, and enter the result in exactly one open category. Scoring makes all remaining provisional words permanent.

If nothing fits well, you take a zero somewhere. That is the game.

### Word rules
- Minimum 3 letters, no maximum.
- The same exact word may not appear twice in one hand.
- Different words from the same letters (EAT, ATE, TEA) are fine if you hold enough separate tiles.
- The same word may be reused on a later turn. Tracking every word across 13 rounds is bookkeeping nobody wants.

### Incomplete hands
You must attempt all five slots. There is no voluntary early stop in untimed play, because it adds no decision.

After the final refresh, any empty slot becomes **rank 0**. A rank 0:
- Adds nothing to a rank total
- Cannot join a matching set
- Cannot count in a full house
- Cannot extend a straight
- May still be scored in Chance
- May be part of a hand you deliberately zero out

---

## 5. Scoring: Three Layers

Final score = **Scorecard + Word Bank + Jumbo bonus**.

### Layer 1: Scorecard (shape)
Yahtzee arithmetic on ranks.

### Layer 2: Word Bank (tile value)
**Only the highest tile-value word in each hand enters the Word Bank.** Blanks count 0. Thirteen entries per game, not sixty-five.

Two words of identical rank can differ wildly:

- JUKEBOX, 7 letters, rank 5, tile value 27
- AERATES, 7 letters, rank 5, tile value 7

Same slot, same category, four times the bank. So you concentrate good letters into one showcase word and dump junk into the four pattern words.

Call it **tile value**, not word quality. Letter values measure scarcity, not cleverness. AERATES is arguably the harder find.

**Known behavior to watch:** once your money word is banked at 27, the other four words have no letter-value incentive at all. The likely player report is "one good word and four chores." That may be perfectly fun, since it gives every turn a featured play. Measure it before changing it. If it reads as filler, the ranked fixes are: score the two best words at half value each; or cap the best word at 20; or pay a small bonus when all five words clear a modest tile-value floor.

### Layer 3: Jumbo (once per game)
The **first** word of 9 or more letters you play all game earns a one-time bonus of **3 x its length**. 9 letters pays 27, 13 letters pays 39.

Jumbo occupies no category and requires no particular turn. It is the spectacular-moment reward, nothing more.

### On rewarding hard words
A fair criticism of the design: Chance scores the sum of ranks, so FINISHED and QUIXOTRY are worth exactly the same there despite one being far harder to find. Complexity currently has only one home, the Word Bank, and only for one word per hand.

I am leaving Chance as a rank category anyway. Chance is the pressure valve that lets a ruined hand score something, and giving it a large variable payout turns the safety net into a jackpot. If complexity needs a louder reward, the variant to test is listed in section 12, not a change to Chance.

---

## 6. The Scorecard

### Upper Section

| Category | Meaning | Score |
|---|---|---|
| Ones | 3-letter words | 1 per word |
| Twos | 4-letter words | 2 per word |
| Threes | 5-letter words | 3 per word |
| Fours | 6-letter words | 4 per word |
| Fives | 7-letter words | 5 per word |
| Sixes | 8+ letter words | 6 per word |

**Upper Bonus:** 63 or more in the upper section, add **+35**.

Treat 63 as a placeholder, and expect to need **three different thresholds**, one per difficulty. Yahtzee's number assumes all six faces are equally likely. Here the upper section has a difficulty ramp: Ones through Threes are nearly free and Sixes is a wall, so in practice the bonus asks "can you produce three 8-letter words." Tune from at least 30 complete games per difficulty, targeting a 25 to 40 percent earn rate for competent players.

### Lower Section

| Category | Requirement | Score |
|---|---|---|
| Three of a Kind | at least 3 words of one rank | Sum of all 5 ranks |
| Four of a Kind | at least 4 words of one rank | Sum of all 5 ranks |
| Full House | exactly two distinct ranks, 3 and 2 | 25 |
| Small Straight | 4 distinct consecutive nonzero ranks | 30 |
| Large Straight | 5 distinct consecutive nonzero ranks | 40 |
| Chance | anything | Sum of all 5 ranks |
| **Rack Five** | all 5 words the same rank | **10 x rank** |

### Hand qualification rules

These belong in the evaluator and in the printed rules. Leaving them implicit guarantees arguments and inconsistent implementations.

- **Three of a Kind** means *at least* three of one rank. Four of a Kind and Rack Five both qualify.
- **Four of a Kind** means *at least* four. Rack Five qualifies.
- **Full House** requires exactly two distinct ranks in a 3-and-2 split. **A Rack Five does not qualify**, since it has only one distinct rank. This is a known ambiguity in Yahtzee rule sets and we are taking the stricter reading. Announce it.
- **Small Straight** needs four distinct consecutive nonzero ranks. The fifth word can be anything, including a duplicate, exactly as the fifth die need not participate in Yahtzee.
- **Large Straight** needs all five distinct and consecutive.
- Rank 0 never satisfies any pattern requirement.

### Rack Five scaling

| Hand | Tiles | Score | Available on |
|---|---:|---:|---|
| Five 3-letter words | 15 | 10 | all |
| Five 4-letter words | 20 | 20 | all |
| Five 5-letter words | 25 | 30 | all |
| Five 6-letter words | 30 | 40 | all |
| Five 7-letter words | 35 | 50 | all |
| Five 8+ letter words | 40 | 60 | Easy, Medium |

One line to remember: **Rack Five scores ten times its rank.**

A rank-1 Rack Five pays 10, which makes the category a soft dumping ground on a ruined turn rather than a jackpot to farm. No repeat bonus. Revisit only if testing proves rank 5 and 6 Rack Fives are genuinely rare, and even then restrict the bonus to those ranks.

---

## 7. Game Lengths

### Full game
All 13 categories.

### Short game (6 rounds)
Do not draw categories at random. A random draw can deal a trivial upper section, a brutal one, or a lower section with no Chance in it.

Structured draw:

1. One random **low upper**: Ones or Twos
2. One random **mid upper**: Threes or Fours
3. One random **high upper**: Fives or Sixes
4. **Chance**, always
5. Two random **pattern** categories from Three of a Kind, Four of a Kind, Full House, Small Straight, Large Straight, Rack Five

This guarantees a difficulty ramp and one safe landing spot for a bad hand, while staying varied between plays.

**Open item:** the upper bonus does not work in a 6-round game, since three upper categories cannot reach 63. Simplest resolution is no upper bonus in the short game. A scaled threshold is possible but adds arithmetic to the format that exists to be quick. Decide before the short game ships.

---

## 8. Timing

| Mode | Time | Purpose |
|---|---|---|
| Relaxed | Untimed | Solo puzzle, learning |
| Standard | 3 minutes per turn | Normal play |
| Blitz | 90 seconds per turn | Experienced or party play |

At the buzzer, unfilled slots become rank 0.

Thirteen rounds at 3 minutes is roughly 40 minutes of turn time plus scoring decisions. If that runs long, that is what the short game is for.

---

## 9. Single Player First, Multiplayer Later

### The decision

**Phase 1 ships solo only, with a high score board.** No live multiplayer.

Live cross-device play needs server-side rack generation, synced clocks, reconnection handling, and conflict resolution. None of that tells you whether the game is fun. Thirteen rounds of solo play does.

### Answering the letter-pool question directly

Multiplayer does **not** need different letter pools per player. The opposite. Different pools would be unverifiable and unfair to compare, since one player's bag could simply be kinder. Fair multiplayer means **everyone gets identical letters and identical replacement luck**, and differs only in what they do with them. The best moment this game can produce is two people pulling completely different solutions out of the same 40 tiles, and that requires sameness, not variety.

Which means the fairness mechanism and the solo replay mechanism are the same mechanism.

### The roadmap

**Phase 1: Solo Arcade**
- 13-round runs, three difficulties, three timing modes
- Local leaderboard, **separate per difficulty**
- Every completed run stored with its seed so it can be replayed

**Phase 2: Daily Challenge (async multiplayer, no synchronization)**
- One seed per day per difficulty, identical for everyone
- Play whenever, compare scores on a shared board
- This is genuinely competitive play with zero live-session infrastructure, and it is the highest value per unit of work in the whole roadmap. Build it second.

**Phase 3: Live Simultaneous Same Rack**
- All players in a match receive the same seed
- Everyone builds, refreshes, and locks independently on their own copy
- Nobody takes tiles from anyone
- Reveal at the end of each round

**Deliberately not planned:** the Shared Rack race (players competing to claim tiles from one live rack) and the Steal mode from V1. The first is a different game wearing these components, with unresolved problems around simultaneous claims and one player's refresh destroying another's plan. The second was incoherent, since in a completed game every category is filled and nobody has an open category to punish.

### Leaderboards must separate by difficulty

An Easy player gets more completed patterns, more Word Bank opportunities, more Jumbos, fewer empty slots, and a better shot at the upper bonus. Their scores are not comparable.

Keep separate records for Easy, Medium, and Hard. **Do not add difficulty multipliers to unify them.** A guessed multiplier is a guaranteed exploit. If a unified board is wanted later, derive the weighting from real score distributions.

### The harness: build this in phase 1

The point of the roadmap is that phases 2 and 3 should require almost no rework. Three things make that true, and all three are nearly free now.

**1. Seeded deterministic generation. Never call `Math.random()`.**

Every run is fully determined by `(seed, difficulty)`. From the seed, generate per turn:
- the opening rack
- an ordered **replacement queue** of 20 tiles drawn from the unseen remainder

Twenty is exactly sufficient: two refreshes at a 10-tile cap. Players who discard different tiles, or different quantities, still receive the same first replacement, second replacement, and so on. Choice is preserved; luck is reproducible.

This one decision buys you replays, daily challenges, fair matches, and server-side score verification by replaying an action log. Retrofitting it later means rewriting the core loop.

**2. Data model that already has room for other players.**

```js
const run = {
  runId,
  seed,                 // everything derives from this
  difficulty: 'medium',
  budget: 40,           // never hardcode 40 anywhere else
  gameLength: 'full',   // 'full' | 'short'
  timing: 'standard',
  mode: 'solo',         // 'solo' | 'daily' | 'match'
  matchId: null,        // phase 3 populates this
  players: [ playerState ],   // length 1 in phase 1, and that is the point
  turns: [ turnRecord ],       // full action log, replayable
  finalScore
};

const turnState = {
  budget: 40,
  loose: ['A','E','T','R','S' /* ... */],
  slots: [ /* slot objects */ ],
  replacementQueue: [ /* 20 tiles, seeded order */ ],
  queueIndex: 0,
  refreshesLeft: 2
};
// invariant, assert after every action:
// turnState.loose.length + sum(slot.word.length) === turnState.budget

const slot = {
  word: 'JUKEBOX',
  rank: 5,
  tileValue: 27,
  provisional: true,        // becomes false on refresh or scoring
  blanks: []               // e.g. [{ index: 3, letter: 'E' }]
};
```

A `players` array of length one and a null `matchId` are the whole stub. Scoring, rendering, and state transitions should all read from a player object even when there is only one.

**3. UI shelf with visible, disabled future modes.**

- Mode select: **Solo** (live), **Daily Challenge** (greyed, "Coming soon"), **Multiplayer** (greyed, "Coming soon")
- Leaderboard: tabs for Easy / Medium / Hard (live), plus a greyed **Friends** tab
- Post-run screen: a **Share this seed** button, which is a real phase 1 feature and quietly the entire daily challenge mechanic in disguise

Building the frame with the empty rooms visible costs an afternoon and prevents the phase 2 UI from being bolted on sideways.

### Physical multiplayer is a separate problem

True simultaneous same-rack play cannot be done with one physical 100-tile bag. Several players cannot independently lock and refresh from identical racks out of a shared supply, and V2's suggestion of "separate refresh piles" does not fix it unless those piles contain duplicate sequences.

Physical multiplayer needs one of: a full tile set per player, printed letter sheets generated per round, a companion app supplying each rack, or sequential play with different draws and the honest admission that it is no longer perfectly equal.

The tabletop and digital versions may simply need different multiplayer rules. That is acceptable.

---

## 10. Dictionary and Challenges

State the practical rule before play:

> Any entry in the selected dictionary is legal unless it is a proper noun, an abbreviation, a hyphenated term, or contains an apostrophe. Plurals and ordinary inflections are legal if the dictionary lists them.

**Physical challenge, no penalty, clock paused:**
- **Pause the timer during lookup.** Otherwise an opponent can challenge words they know are valid purely to drain your clock. That is a weaponizable rule and it would get weaponized.
- Valid word: it stays, play resumes from the same remaining time.
- Invalid word: it unlocks, letters return to the loose pile, play resumes from the same remaining time.

Lost time on invalid words is penalty enough. Arguments over obscure words should not become the game.

In simultaneous play, handle challenges after the round or with a dictionary app. Several people stopping and starting separate clocks is chaos.

**Blanks:** count as one letter toward length, worth 0 tile value, chosen letter fixed at permanence. Both blanks may go in one word. Two blanks do not make a Jumbo automatic, because you still need seven or more useful real letters and a valid word.

---

## 11. Digital Build Notes

**Dictionary.** ENABLE (~172k) or TWL06 (~178k) in a Set for O(1) lookup. SOWPODS if you want 267k. Compressed trie if size matters.

**Validation, two checks.** Word exists in dictionary; letters are a multiset subset of the loose pile.

**Solver, tiered.** V2 called a full solver mandatory. That was wrong and would have blocked the prototype.

Build for phase 1:
1. Word validation
2. Rack subset validation
3. A hint that surfaces one valid word of a requested length

Defer:
4. Finding five non-overlapping words that optimize a category. Genuinely hard, because the five words compete for the same tiles and finding one valid word proves nothing about the remaining four.
5. A strategic CPU opponent. A weak one makes the game look worse than it is.

Skip the dead-rack detector. With 35 or more tiles a truly dead rack is close to impossible, and if it happens after both refreshes, the empty slots become rank 0. No exception needed.

For candidate generation, do not enumerate rack subsets. Filter the dictionary by target length and test each candidate against the rack multiset. Tens of thousands of cheap checks.

**Hint cost, fully specified:**

> A hint costs 3 points and reveals one valid word of a chosen length from the current loose tiles. The Word Bank cannot go below zero. Maximum two hints per game.

The hint makes no promise that its word belongs in an optimal five-word solution. And do not auto-highlight every findable word, ever. That converts the game into picking from a list the computer produced.

**Screen layout.**

```
+--------------------------------------------------+
|  MEDIUM   Turn 4 / 13        2:47                |
|  Budget: 27 loose + 13 committed = 40            |
|  Refreshes: 2 left  (up to 10 tiles each)        |
+--------------------------------------------------+
|  LOOSE RACK        [sort A-Z] [sort by value]    |
|  [ 27 tiles, 5 x 8 grid ]                        |
+--------------------------------------------------+
|  BUILD BAR  [ _ _ _ _ _ _ ]   [UNDO] [PLACE]     |
+--------------------------------------------------+
|  SLOTS                          (all provisional)|
|  1  JUKEBOX   rank 5   tile 27   <- money word   |
|  2  MOTELS    rank 4   tile 8                    |
|  3  ......                                       |
|  4  ......                                       |
|  5  ......                                       |
+--------------------------------------------------+
|  SCORECARD (collapsible, long-press to preview)  |
|  Word Bank: 142        Jumbo: not yet claimed    |
+--------------------------------------------------+
```

**Required interface behavior:**
- Loose and committed tiles visually distinct
- Budget line always visible
- Sort loose tiles alphabetically or by tile value
- Long-press any open category to preview what the current hand would score there
- Never make the player convert length to rank in their head
- **No confirmation dialog on placing a word.** Use a brief lock animation and a three-second undo banner. Words are provisional anyway.
- **Explicit warning before a refresh**, since that is the action that makes words permanent, and it is the only genuinely irreversible click in the turn
- Obvious blank assignment
- Plain-language result line after scoring: "Full House: three rank-4 words and two rank-2 words. +25"

**Build order:**
1. `lengthToRank()` and an evaluator taking five ranks, returning what every category pays. Roughly 80 lines, and it is the entire game.
2. The budget invariant as an assertion after every action. This is the rule V1 got wrong and exactly the kind of thing that silently rots during UI work.
3. The seeded generator. Do it before the UI, not after.

---

## 12. The Real Open Question, and How to Measure It

Yahtzee hands you a random result and lets you keep part of it. Rack Five hands you a large visible rack and lets you deliberately construct a result. With that much information, a strong player may simply decide which category to pursue and then manufacture it.

If that is what happens, the game becomes a series of assignments rather than a reaction to fortune, and the scorecard stops telling a story. The moment the design needs is:

> I was going for a full house, but the letters handed me a large straight instead.

### The measurement protocol, in this exact order

1. Reveal the opening rack.
2. Let the player inspect it.
3. **Before any building or refreshing, record the category they now intend to pursue.**
4. After the first refresh, record the category they are now considering.
5. Record the category actually scored.

Step 3 timing is the whole test. Recorded before the rack is revealed, it measures blind luck, which is the opposite of the question. Recorded after inspection, the gap between steps 3 and 5 measures exactly how manufacturable the game is, and the gap between 3 and 4 measures whether refreshes genuinely redirect strategy.

### What the difficulty tiers are actually for

Compare intended-category success rate across all three modes.

- If it runs something like 90 percent Easy, 75 percent Medium, 55 percent Hard, then rack size is a real difficulty control and the design works.
- If the three rates come back nearly identical, **rack size is not doing the work** and the refresh system is the stronger lever. Cut the refresh cap from 10 to 6 and measure again.

That is why difficulty belongs in phase 1 rather than being deferred. It is not decoration, it is the experiment.

### The other unresolved risk

Skill dominates luck more than in Yahtzee. Randomness only enters at the draw, and a good player routes around bad letters. A beginner beats an expert at Yahtzee maybe 40 percent of the time because dice do not care about you. Here they will get buried. The timer is the cheapest compression. A per-player budget handicap is the next lever, and note that the difficulty system has already built the mechanism for it.

---

## 13. Variants, Not Base Rules

Prototype switches. None ship in phase 1.

**Blind Declaration.** Name your target category before the rack is revealed. Score it at full value, any other category at half. This attacks the manufacturability problem head on by restoring genuine uncertainty. The first variant I would test.

**Chance scores tile value.** Chance pays the summed tile value of all five words instead of the rank sum, turning it into the go-for-broke slot where a nasty word actually pays. Not in the base game because Chance is the safety net and a large variable payout undermines that job, but this is the direct answer if complexity needs a louder home than the Word Bank gives it.

**Carry-Over.** Keep up to 5 unspent tiles into the next turn, letting you stockpile toward a Jumbo. Excluded because it lowers the risk of long-word attempts and skews the next rack's distribution.

**Power Letters.** The first word each turn containing a real J, Q, X, or Z earns one free single-tile swap (one loose out, one new in, budget unchanged, not a refresh).

Kept out of the base rules deliberately. It rewards knowing obscure high-value short words, which is vocabulary trivia rather than the length strategy the game is built to test, and it widens the exact skill gap that is already this design's biggest weakness. Rare letters already pay through tile value in the Word Bank. Test that alone first. Add the swap only if players routinely discard J, Q, X, and Z on sight and report them as irritating rather than interesting.

**Rules to avoid entirely:**
- A separate rare-letter scorecard category. The card is full.
- Doubling a whole word for containing X or Z. Tile value already pays for that.
- Letting a rare letter act as a blank. That inverts its identity and makes it boring.
- Granting tiles beyond the turn budget for any reason. The budget is the game.

---

## 14. What the Prototype Must Measure

Do not ask testers whether they liked it. Record what happened.

**Per turn:** difficulty, intended category (post-inspection), category considered after first refresh, category actually scored, refreshes used, tiles refreshed, all five word lengths, tile value of the best word, turn duration, hints used, empty slots, and one word for how it felt (obvious, tense, lucky, clever, frustrating).

**Per game:** difficulty, scorecard total, Word Bank total, Jumbo earned and its length, category frequencies, Rack Five frequency and rank, upper bonus earned, zeroed categories, total time.

### Warning signs
- Intended-category success rate barely differs between Easy, Medium, and Hard
- Players hit their intended category nearly every turn on Medium
- Five short words becomes a repetitive escape hatch
- Word Bank exceeds roughly 30 percent of final score. If so, halve it, rounding down
- Players describe the hand as one good word and four chores
- More time spent sorting tiles than making decisions
- A standard game regularly runs past an hour
- Refresh results rarely change anyone's plan
- Rare letters discarded on sight, every time
- Experienced word players win by hopeless margins

### Good signs
- Success rate drops meaningfully as difficulty rises
- Players reject an impressive long word to protect a pattern
- The refresh decision creates real hesitation, because it is the moment words go permanent
- Players can articulate why they refreshed when they did
- Two players produce meaningfully different solutions from identical letters
- A failed attempt creates a hard scorecard decision instead of simple annoyance
- The scorecard, not the Word Bank, remains the story of the final score

Do not publish a theoretical maximum score until every rule is frozen and a program has verified it.

---

## 15. Recommended First Build

Sections 1 through 11, solo only, and nothing from section 13.

Concretely:
- Three difficulties, Medium default
- Three timing modes, Standard default
- Full 13-round game (short game can wait for the upper-bonus question to be settled)
- Local leaderboard, separated by difficulty
- Seeded deterministic generation, `players` array of one, null `matchId`
- Greyed Daily Challenge and Multiplayer entries on the mode screen
- Share-this-seed button on the results screen

Four pleasures to protect:

1. Finding words in a rich pool of letters
2. Choosing the exact lengths a pattern needs
3. Deciding when to refresh, knowing it locks in everything you have placed so far
4. Deciding where an imperfect hand belongs on the card

The concept does not need more decoration. It needs proof that those four decisions stay tense for thirteen rounds, and a measurement showing that difficulty actually changes how often you get what you planned.
