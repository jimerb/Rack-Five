Build a high-fidelity, responsive product mockup for a digital word game called RACK FIVE.

I am providing three supporting documents:

1. The final rulebook
2  Extensive Mockup details that have wireframes of the screens.  You should look to implement this look and layout ahead of other aspects of the rules. 
3. The Product Requirements Document
4. A quick-start guide for player help

Treat the mockups at the visual and functional direction for the game. The rulebook as the authority for gameplay. Treat the PRD as the authority for product scope, screens, settings, future roadmap, and interaction requirements. Use the quick-start guide for player-facing help language. Do not redesign the game rules or invent new scoring systems.

Note: The mockup has had a lot of time spent on the actual look for the game.  You should do whatever you can to preserve the look and feel. Including templates, graphics, board style and flow.  The scorecard being flexible on the right hand side is desired as shown in the mockup. 

## Product goal

Rack Five is a word game played with the familiar shape of Yahtzee.

Players receive a visible rack of letters, build five words, and each word’s length becomes a rank from 1 through 6. They use those five ranks to fill a Yahtzee-style scorecard. The important strategic tension is:

“Do I build the best word I can, or the word length my scorecard needs?”

The application should feel intelligent, satisfying, modern, and fun. It should make word-building feel tactile and rewarding, while keeping the scorecard understandable rather than intimidating.

## Overall visual direction

Take strong queues from the mockup. this has been though through carefully. 

## Themes

Take strong queues from the mockup. this has been though through carefully. 

## What to design

Create a coherent application with the following screens and states.

### 1. Home screen

Include:

- Rack Five logo and identity
- Primary “Play Solo” action
- “Resume Game” state when a game is in progress
- “Play a Seed” option
- Personal best summary
- Navigation to Leaderboards, How to Play, and Settings
- Daily Challenge card, visibly disabled and labeled “Coming soon”
- Multiplayer card, visibly disabled and labeled “Coming soon”

The Coming Soon areas should feel intentional and exciting, not broken.

### 2. Game setup

Include controls for:

- Difficulty: Easy, Medium, Hard
- Explain the letter budget for each:
  - Easy: 45 letters
  - Medium: 40 letters, the default
  - Hard: 35 letters
- Timing:
  - Relaxed
  - Standard, 3 minutes per turn
  - Blitz, 90 seconds per turn
- Full Game, 13 rounds
- Seed entry or generated seed
- Standard Rules versus Custom Rules
- Access to Advanced Gameplay settings

Make Medium and Standard the visually selected defaults.

Clearly explain that Hard has tighter letter pressure and that a rank-6 Rack Five cannot be made there. Keep the explanation simple and elegant.

### 3. Main gameplay screen

This is the most important screen. Make it feel excellent.

It should include:

- Current theme styling
- Difficulty, turn number, and timer
- Persistent budget line, such as:
  “Budget: 27 loose + 13 placed = 40”
- Refreshes remaining and maximum tiles per refresh
- Loose letter rack
- Sort controls for A-Z and tile value
- Build Bar
- Undo and Place actions
- Five word slots
- Clear distinction between:
  - Loose tiles
  - Provisional placed words that can still be edited
  - Permanent words that are locked after a refresh
- Each word should show:
  - Word
  - Rank
  - Tile value
  - Whether it is provisional or permanent
- Word Bank total
- Jumbo status
- Hint access
- Collapsible scorecard panel
- Category previews showing what the current hand would score

Use believable example content such as JUKEBOX, AERATES, MOTELS, or similar valid-looking words. Make sure the visual examples follow the rulebook’s rank system.

The player should immediately understand that word length becomes rank. Do not force mental math.

### 4. Important gameplay interaction states

Create mockup states for:

- Fresh starting rack. Peices can be dragged around like indicated in the mockup.
- Selecting tiles into the Build Bar
- Placing a valid provisional word
- Invalid word feedback
- Blank-letter assignment
- Editing or removing a provisional word
- Refresh tile selection
- Refresh warning modal or sheet that clearly says placed words will become permanent
- Rack after refreshing
- Permanent locked words
- Scorecard preview with multiple possible category scores
- Jumbo earned celebration
- Hint purchase and revealed suggestion
- Timer nearly expired
- Timed-out hand with rank-0 empty slots
- Scoring confirmation
- Turn-complete summary
- Use legitimate open sources of dictionaries.  In settings you should have a setting on what dictionary to use. Right now you only need english but this option will allow for international laungages in a later phase.
- Sound effects need to be wired.

### 5. Scorecard

The scorecard needs excellent design attention.

It includes:

Upper section:

- Ones
- Twos
- Threes
- Fours
- Fives
- Sixes
- Upper Bonus

Lower section:

- Three of a Kind
- Four of a Kind
- Full House
- Small Straight
- Large Straight
- Chance
- Rack Five

The scorecard should:

- Clearly show used versus open categories
- Show likely score previews for the current hand
- Make zeroing a category understandable
- Display plain-language help when a category is selected
- Feel like a satisfying strategic record of the game
- Avoid looking like a boring spreadsheet
- Normally dock to the right side as shown in the mockup but flexible to snap elsewhere for phone or tablet. 

### 6. How to Play and help

Create an attractive How to Play section based on the quick-start guide and rulebook.

It should explain:

- The core idea
- How word length becomes rank
- Difficulty and letter budgets
- Provisional words
- Refreshing and permanent commitment
- Scorecard categories
- Word Bank
- Jumbo
- Hints
- Blanks
- Timing
- Seeds and replay
- Coming-soon Daily Challenge and Multiplayer

Use visual examples, mini diagrams, tile examples, and scorecard examples where useful. Do not make it wall-of-text help.  The mockup has already attempted this. 

Also include contextual help affordances in the game screen near:

- Budget
- Refresh
- Scorecard
- Word Bank
- Jumbo
- Rank display

### 7. Results screen

Include:

- Large final score
- Score breakdown:
  - Scorecard total
  - Upper Bonus
  - Word Bank
  - Jumbo
  - Hint cost if used
- Completed scorecard
- Difficulty and timing
- Seed
- Personal-best treatment when earned
- Local leaderboard placement
- Replay This Run
- Share This Seed
- Play Another
- Turn breakdown

The “Share This Seed” action should feel real and useful. It is important because it is the foundation for future daily challenges and fair same-rack play.

### 8. Leaderboards

Design local leaderboards with:

- Tabs for Easy, Medium, Hard
- Timing filters or separate views for Relaxed, Standard, and Blitz
- Score rows with useful metadata
- Friends tab disabled and labeled Coming soon
- Empty state
- Populated state
- Clear distinction between Standard and Custom runs

Do not mix scores from different difficulties into one unfair leaderboard.

### 9. Settings

Include:

- Theme picker with previews and saved selection
- Audio, haptics, and reduced-motion controls
- Accessibility controls
- Tile sorting preference
- Tutorial reset
- Advanced Gameplay entry including the gameplay lab which provides for tuning the system rather than having values hardcoded into the program.  
- Export Playtest Data entry
- The dictionary should be "on" by default. If there are multiple dictionaries to choose from then that shold be an option in settings.  Include the english Dictionaries you know of.  If there is a description of them then include that like for instance ones with medical terms or complex words.  Figure out what the best default dictionary should be. Later on if international languages are added we will just need to add the dictionary. 

### 10. Advanced Gameplay Lab

Include an Advanced Gameplay area intended for testing and balance tuning.

Make it clear that changing values creates a Custom Run that does not enter standard leaderboards.

Design controls or mock controls for:

- Letter budget
- Refresh count
- Refresh cap
- Upper-bonus threshold
- Upper-bonus points
- Jumbo length and multiplier
- Hint cost and hint count
- Word Bank behavior
- Timer values
- Experimental variants

Experimental variants should be visible as off by default:

- Blind Declaration
- Chance Scores Tile Value
- Carry-Over
- Power Letters

This section should look purposeful and professional, like a safe testing lab, not a messy developer panel.

## Future feature framing

Show these as deliberately planned but not available yet:

- Daily Challenge: everyone gets the same daily seed and compares scores asynchronously
- Multiplayer: everyone receives the same letters and replacement luck, solves independently, then reveals results
- Friends leaderboard
- Short Game, if you include it, should be clearly marked Coming soon

Do not mock Shared Rack race mode or Steal mode. They are deliberately not planned.

## Interaction and information design priorities

Prioritize clarity around these concepts:

1. The fixed letter budget
2. The difference between provisional and permanent words
3. Refreshing as the irreversible commitment point
4. Word length becoming rank
5. The current hand’s possible scorecard results
6. One high-value Word Bank word per turn
7. Jumbo as a once-per-game moment
8. Difficulty changing the number of available letters
9. Seeds making a game replayable and shareable

## Design constraints

- Use the supplied mockup,  rulebook and PRD closely.
- Do not change core scores, rank mapping, refresh rules, or roadmap.
- Keep the initial live product focused on Solo Arcade.
- Make Daily Challenge, Multiplayer, and Friends visually present but disabled.
- Do not pretend the prototype has a real server, live opponents, or full dictionary solver.
- Preserve a path for future growth without making the main experience feel unfinished.
- Make the app feel like a complete, polished game even though some future systems are only skeletons.
- Mid game if you go to settings then return to play it should not start a new game.  Figure this out.
- Consider that eventually the game will be running as a website (hosted.)





