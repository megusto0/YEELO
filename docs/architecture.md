# Architecture Notes

This document explains how YEELO turns a Kanye catalog dataset into interactive song and album rankings.

## Runtime Overview

The app is fully client-side:

- `src/main.jsx` mounts the React app.
- `src/App.jsx` chooses between the battle, song leaderboard, and album leaderboard tabs.
- `src/store.js` owns durable ranking state and all mutation flows.
- `src/logic/rankingLogic.js` contains the matchup and scoring rules.
- `src/data/songs.js` is the canonical catalog source for songs, albums, colors, and Deezer IDs.

There is no server, auth layer, or database. Persistence is handled in the browser with localStorage.

## State Model

The Zustand store keeps the entire ranking session in memory and serializes a subset to localStorage under `kanye-elo-v2`.

Each song starts with:

- `elo: 1500`
- `rd: 350`
- `wins: 0`
- `losses: 0`
- `matches: 0`
- `eloHistory: []`

The store also tracks:

- `matchHistory`
- `totalMatches`
- `seenPairs`
- `recentSongIds`
- `currentMatchup`
- `lastMatch`
- UI state such as active tab, expanded rows, onboarding state, and settings visibility

`mergeDefaults()` protects older saved payloads by adding state entries for songs that were introduced later in the catalog.

## Battle Flow

The battle loop lives in `src/pages/Arena.jsx`.

1. Arena requests a matchup from `selectMatchup(...)`.
2. The selected pair is stored in Zustand as `currentMatchup`.
3. The user previews audio and clicks left or right.
4. `recordMatch(idA, idB, winnerId)` updates both songs.
5. Arena reads `lastMatch` back out of the store to show Elo deltas.
6. After the result animation, a new matchup is generated.

Users can also:

- Skip a matchup
- Undo the last matchup
- Use keyboard shortcuts for all core actions
- Queue a specific song from the leaderboard into the next battle

## Matchup Selection Strategy

`selectMatchup()` is not purely random. It uses several heuristics to keep the ranking process efficient.

### Song Eligibility

Only songs with `deezerId != null` are considered battle candidates. That keeps every matchup playable from the UI's perspective.

### Early Session Bias

For roughly the first 20 matches, the logic prefers unrated songs. It also tries to create cross-album battles most of the time so the early graph is not overly siloed.

### Uncertainty Sampling

Every fifth match, the selector looks for songs with high rating deviation and tries to pair them against songs with nearby Elo. This reduces uncertainty on songs that still have weak confidence.

### Similar Skill Matching

Once enough songs have been played, the selector mostly tries to pair songs with similar Elo within an expanding search window. This keeps comparisons informative instead of producing obvious blowouts.

### Variety Controls

The selector avoids very recent songs when possible and tracks seen song pairs to reduce immediate repeats. If the current pair has already been seen, it tries to substitute in an unused opponent.

### Manual Queueing

If a user clicks "BATTLE THIS SONG NEXT" from the leaderboard, the next matchup is forced to include that song and a nearby Elo opponent.

## Ranking Model

YEELO uses a simplified Elo variant plus a confidence signal based on rating deviation.

### Expected Score

The expected score is standard Elo:

`1 / (1 + 10 ^ ((rB - rA) / 400))`

### Dynamic K-Factor

`getK(rd)` raises or lowers volatility based on confidence:

- `64` when `rd > 200`
- `32` when `100 <= rd <= 200`
- `16` when `rd < 100`

New or uncertain songs move faster. Stable songs move more slowly.

### Rating Deviation Decay

After a match, both songs reduce `rd`:

- Base decay is `8`
- Close matches decay by `15`
- Upsets decay by `20`

This is a practical confidence signal rather than a full Glicko implementation. The goal is to reward informative matches by reducing uncertainty faster.

### Anti-Inflation Pass

Every 50 total matches, `applyAntiInflation()` nudges rated songs slightly back toward 1500:

`elo = elo + 0.005 * (1500 - elo)`

That keeps the pool from drifting too far over long sessions.

## Undo And History

`lastMatch` stores the pre- and post-match values needed to reverse the most recent decision. Undo restores:

- Elo
- Rating deviation
- Win/loss totals
- Match counts
- Elo history
- Match history length
- Recent song queue state

The app also records up to 500 historical match entries for leaderboard detail and data export.

## Song Leaderboard

`src/pages/Leaderboard.jsx` derives the song table from `SONGS` plus `songStates`.

Behavior includes:

- Search by title
- Filter by album
- Sort by Elo, win rate, or match count
- Confidence badges from `getConfidence(rd, matches)`
- Expandable rows with Elo sparkline and recent match history
- One-click queueing back into battle mode

Ranked songs are sorted separately from unrated songs so the table remains readable during early sessions.

## Album Ranking Model

Album scores are calculated in `computeAlbumScore(songStates, albumId)`.

### Step 1: Filter Rated Songs

Unplayed songs are ignored. If no songs on an album have matches, the album is considered unrated.

### Step 2: Weight Songs By Confidence

Each rated song receives a weight based on its rating deviation:

`1 / (1 + rd / 100) ^ 2`

Lower-uncertainty songs contribute more heavily to the album average.

### Step 3: Blend Average And Peaks

The album composite is:

- `55%` weighted average Elo
- `25%` highest-rated song
- `12%` second-highest song
- `8%` third-highest song

This intentionally favors albums that are both strong overall and top-heavy with standout tracks.

### Step 4: Confidence Label

Album confidence is derived from how much of the album has been rated:

- `UNRANKED` when nothing is rated
- `LOW` when under 30% is rated
- `MED` when under 70% is rated
- `HIGH` otherwise

## Audio Preview Flow

`src/components/SongCard.jsx` handles preview playback.

1. The card reads the song's `deezerId`.
2. On first play, it fetches `https://api.deezer.com/track/:id` through `https://corsproxy.io/`.
3. It extracts `data.preview`.
4. The preview URL is cached in the module-level `previewCache`.
5. An `<audio>` element handles playback, elapsed time, and scrubbing.

If the fetch fails or no preview exists, the UI flips into a no-preview state for that card.

## Import, Export, And Reset

The settings modal calls store actions that work entirely in-browser.

### Export

Exports the current state to a JSON file named like `kanye-elo-YYYY-MM-DD.json`.

### Import Replace

Replaces the active session with imported song states, history, seen pairs, and totals, while still merging in defaults for any newer songs added to the codebase later.

### Import Merge

Adds missing song records from the import, appends match history, sums total matches, and unions seen pairs. It does not overwrite already-existing song states.

### Reset

Resets all song states and history back to the initial 1500 / 350 baseline.

## Catalog And Helper Artifacts

The runtime catalog is hard-coded in `src/data/songs.js`.

The repo also includes:

- `deezer-ids.json`
- `deezer-map.json`
- `preview-urls.json`
- `scripts/fetchDeezerIds.js`

Those files appear to support catalog maintenance and preview discovery work. The production client currently reads from `src/data/songs.js` rather than from those JSON artifacts directly.

## Design Implications

This architecture is intentionally simple:

- Easy to deploy as a static site
- No backend cost
- No account system
- Fast iteration on ranking rules

The tradeoff is that user progress is tied to the browser unless manually exported, and audio preview reliability depends on third-party services outside the app's control.
