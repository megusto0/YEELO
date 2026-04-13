# YEELO

YEELO is a browser-based Kanye West song ranking app. It turns the catalog into a stream of head-to-head battles, lets the user pick a winner, and updates song and album rankings in real time using a custom Elo-style model.

The app is built as a client-side React + Vite project with Zustand for state management and localStorage persistence. It currently tracks 236 catalog entries across 16 album groupings, with 210 songs eligible for battle because they have Deezer track IDs available for preview playback.

## What The App Does

- Shows two songs at a time in a battle view.
- Lets the user listen to short Deezer previews before voting.
- Updates each song's rating, confidence, win/loss record, and rating history after every pick.
- Builds a ranked song leaderboard with filters, sort modes, recent match history, and quick re-queueing into battle mode.
- Builds album rankings from the underlying song ratings using a weighted composite score.
- Saves all progress locally and supports export, import, merge, replace, and reset flows.

## How It Works

At a high level, the app keeps a state object for every song with Elo, rating deviation, win/loss totals, match count, and a short Elo history. Battle mode selects a matchup, the user picks a winner, and the store records the result. The ranking logic recalculates both songs, reduces uncertainty, stores the result in history, and periodically applies a small anti-inflation adjustment.

Album rankings are not hand-authored. They are computed from the rated songs inside each album, with more confidence given to songs whose uncertainty has dropped through repeated play. A deeper implementation breakdown is available in [docs/architecture.md](docs/architecture.md).

## Main Screens

### Battle

The battle screen is the core loop:

- Two songs are displayed side by side.
- Each card can play a Deezer preview, seek within the preview, and then register a left or right pick.
- Users can skip a matchup, undo the last result, or use keyboard shortcuts.
- Early in a session, the app tries to spread exposure across unrated songs before tightening into closer Elo-based comparisons.

### Song Rankings

The song leaderboard:

- Lists ranked songs first and unrated songs below.
- Supports text search, album filtering, and sorting by Elo, win rate, or number of matches.
- Expands each song to show rating deviation, a small Elo sparkline, and recent head-to-head results.
- Can queue a song back into the next battle matchup.

### Album Rankings

The album view:

- Computes a composite score for each album from its rated tracks.
- Shows peak track, raw average Elo, number of rated songs, and a confidence label.
- Expands to show the song-by-song breakdown that produced the album score.

### Settings

The settings modal exposes:

- Data export to JSON
- Data import in `replace` or `merge` mode
- Full local reset
- Keyboard shortcut help

## Tech Stack

- React 19
- Vite 8
- Zustand for client state
- Recharts for Elo trend sparklines
- Deezer track metadata for preview playback

## Project Structure

```text
src/
  App.jsx                  App shell and tab navigation
  store.js                 Global state, persistence, import/export, match recording
  logic/rankingLogic.js    Matchup selection and ranking calculations
  data/songs.js            Catalog, album metadata, and Deezer IDs
  pages/
    Arena.jsx              Head-to-head voting flow
    Leaderboard.jsx        Song rankings and filtering
    AlbumRankings.jsx      Album score aggregation
  components/
    SongCard.jsx           Audio preview controls and pick interaction
    Settings.jsx           Export/import/reset modal
    Onboarding.jsx         First-run intro overlay
    Sparkline.jsx          Rating history chart
scripts/
  fetchDeezerIds.js        Helper script for collecting preview URLs
```

## Getting Started

### Requirements

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Start The Dev Server

```bash
npm run dev
```

### Build For Production

```bash
npm run build
```

### Preview The Production Build

```bash
npm run preview
```

## Data Model

The catalog lives in `src/data/songs.js`. Each song entry includes:

- A stable internal `id`
- A display `title`
- An `album` identifier
- An inferred `albumYear`
- An optional `deezerId`

Only songs with a `deezerId` are eligible for battle mode, because the app uses that ID to request a preview URL at runtime.

## Audio Preview Pipeline

Runtime preview playback works like this:

1. A `SongCard` receives a song with a `deezerId`.
2. On first play, the client requests `https://api.deezer.com/track/:id` through `corsproxy.io`.
3. The returned `preview` URL is cached in memory for the session.
4. The user can play, stop, and scrub the preview before voting.

If a preview lookup fails, the card falls back to a `NO PREVIEW AVAILABLE` state.

## Persistence

All ranking progress is stored in the browser under the localStorage key `kanye-elo-v2`. The saved payload includes:

- Song states
- Match history
- Total match count
- Seen matchup pairs
- Onboarding completion state

This makes the app fully client-side. There is no backend or database in the current architecture.

## Helper Files In The Repo

The repository also includes `deezer-ids.json`, `deezer-map.json`, and `preview-urls.json`. These are reference or generated artifacts from catalog and preview work. The runtime app reads from `src/data/songs.js`; those JSON files are not part of the core client render path today.

## Known Constraints

- The app depends on Deezer metadata and a public CORS proxy for preview playback.
- Songs without a usable Deezer ID stay out of battle mode.
- All user data is local to the current browser unless exported manually.
- Matchup quality improves as more comparisons reduce rating deviation.

## Additional Documentation

- [docs/architecture.md](docs/architecture.md): state flow, ranking model, matchup heuristics, and album scoring details
