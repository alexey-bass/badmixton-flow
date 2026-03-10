# Badminton 2x2 — Queue Manager

## Project Overview

Local web app for managing player queue and court assignments during amateur badminton 2x2 sessions. Designed for a coach/admin running sessions with 4-20 players on 1-5 courts.

**Primary device:** 12" tablet placed courtside, also works on phones and desktops.

## Tech Stack

- Pure HTML / CSS / JavaScript — no frameworks, no build tools, no npm
- `localStorage` for data persistence (survives refresh)
- Firebase Realtime Database v10.12.0 (compat SDK) for optional multi-device sync (CDN script tags)
- Google Analytics (gtag.js)
- Mobile-first responsive CSS with breakpoints at 768px and 1024px

## Files

```
index.html          — App shell, 10 tab panels, modal, toast container
styles.css          — All styles, CSS variables, responsive breakpoints
app.js              — Application logic (App.Utils through App.DnD)
i18n.js             — App object init, translations (Polish + English), i18n engine
firebase-config.js  — Firebase config + Google Analytics measurement ID
package.json        — npm start script (python3 http.server)
```

**Load order:** `firebase-config.js` (head) → Firebase SDK (CDN) → `i18n.js` → `app.js`

## How to Run

Open `index.html` in a browser. That's it. No server required.

Or use a local server:
```bash
npm start
```

## Development Workflow

### Before every commit:
```bash
npm run validate   # runs syntax check + tests
```

### Rules:
- Every new feature must be covered with tests
- README must be updated when adding features
- All tests must pass before committing

### Testing:
```bash
npm test           # run all tests
npm run check      # syntax check only
npm run validate   # both check + test
```

Tests use Node.js built-in `node:test` runner (no npm dependencies). Test files are in `test/` directory. Browser APIs are mocked in `test/helpers.js`.

## Architecture

Single global `App` object (created in `i18n.js`) with modules:

| Module         | Purpose                                          |
|----------------|--------------------------------------------------|
| `App.i18n`     | Internationalization (Polish + English)           |
| `App.Analytics`| Google Analytics event tracking wrapper             |
| `App.Utils`    | ID generation, date/time formatting               |
| `App.Storage`  | localStorage read/write, JSON export/import, state migration |
| `App.Session`  | Session create/reset, court initialization         |
| `App.Players`  | Add/remove players, mark present/absent, wishes    |
| `App.Queue`    | Waiting queue CRUD, reorder, move to end           |
| `App.Courts`   | Start/finish/cancel games, pair stats, score tracking |
| `App.Matches`  | Match history, filtering, undo last match          |
| `App.Suggest`  | Auto-suggestion algorithm for next 4 players       |
| `App.Sync`     | Firebase Realtime Database sync                    |
| `App.UI`       | All rendering, event binding, modals, toasts       |
| `App.DnD`      | Drag-and-drop (mouse + touch) for queue reorder    |

## Tabs (10 total)

| Tab       | Panel ID        | Mode        | Purpose                        |
|-----------|-----------------|-------------|--------------------------------|
| Board     | panel-board     | Both        | Player-facing court view       |
| Today     | panel-dashboard | Admin only  | Stats, settings, actions       |
| Players   | panel-players   | Both        | Add/remove, mark present       |
| Queue     | panel-queue     | Admin only  | Queue management, reorder      |
| Courts    | panel-courts    | Admin only  | Court management, start games  |
| History   | panel-history   | Admin only  | Match history, filters, undo   |
| Results   | panel-results   | Both        | Leaderboard (wins, points)     |
| Sync      | panel-sync      | Admin only  | Firebase room create/join      |
| Debug     | panel-debug     | Admin only  | State inspector, clear storage |

## Key Concepts

### Living Queue
Players arrive and get a sequential number (#1, #2, ...). After a game finishes, all 4 players go to the **end** of the queue. Queue position is the primary factor for next game selection.

### Suggestion Algorithm
Scores each candidate by:
- Queue position (weight: 100 per position)
- Games above average penalty (weight: 50 per game)
- Unfulfilled wish bonus (-80)

Team split scoring (3 algorithmic options + custom):
- Pair repeat penalty (30 per repeat)
- Opponent repeat penalty (15 per repeat beyond 1st)
- Wish fulfillment bonus (-100)
- 4th "Custom" option: tap-to-swap players between teams or with bench players from queue

### Two UI Modes
- **Board** (player-facing): Courts with teams + timer, queue list, results. One-tap "Finish" with score input.
- **Management** (admin): Full control — all 10 tabs, add/remove players, manual player selection, settings.

Toggle between modes with the gear icon in the header.

### Score Tracking
- Finish confirmation modal with optional score input (e.g. 21:15)
- If score provided: wins/losses and points scored/conceded tracked per player
- Results tab shows leaderboard sorted by wins → win rate → point differential

### i18n (Internationalization)
- Two languages: Polish (default) and English
- Static text uses `data-i18n` attributes on HTML elements
- Dynamic text uses `App.t('key')` function calls
- Language preference saved in `localStorage` (`badminton_lang`)
- Switcher in header with flag buttons

### Firebase Sync
- Admin creates a session on Sync tab, shares the link
- Shareable URL with `?session=` parameter for auto-join
- Config in `firebase-config.js` (public by design for web apps)
- Not required for local single-device use

### Data Migration
- `App.Storage._ensureState()` validates and fills missing fields on load
- Handles corrupted localStorage, old versions, and Firebase sync data
- Player fields auto-migrated (partnerHistory, wins, losses, points, wishedPartner→wishedPartners, etc.)

## Data Model

Session state stored in `localStorage` as `badminton_session_YYYY-MM-DD`:

```
{
  version: 1,
  date: "2026-03-10",
  dayName: "Monday",
  players: { [id]: Player },
  waitingQueue: [playerId, ...],
  courts: { [id]: Court },
  matches: { [id]: Match },
  settings: { courtNumbers, syncEnabled, syncSessionId },
  nextPlayerNumber: 1,
  isAdmin: true
}
```

**Player:** `{ id, number, name, present, gamesPlayed, lastGameEndTime, queueEntryTime, partnerHistory, opponentHistory, wishedPartners: [id, ...], wishesFulfilled: [id, ...], wins, losses, pointsScored, pointsConceded }`

**Court:** `{ id, displayNumber, active, occupied, currentMatch, gameStartTime }`

**Match:** `{ id, startTime, endTime, courtId, teamA: [id,id], teamB: [id,id], score, status }`
