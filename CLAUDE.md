# Badmixton Flow — Badminton 2x2 Queue Manager

## Project Overview

Local web app for managing player queue and court assignments during amateur badminton 2x2 sessions. Designed for a coach/admin running sessions with 4-20 players on 1-5 courts.

**Primary device:** 12" tablet placed courtside, also works on phones and desktops.

## Tech Stack

- Pure HTML / CSS / JavaScript — no frameworks, no build tools, no npm
- PWA with service worker — offline-first, installable on mobile
- `localStorage` for data persistence (survives refresh)
- Firebase Realtime Database v10.12.0 (compat SDK) for optional multi-device sync (CDN script tags)
- Google Analytics (gtag.js)
- Mobile-first responsive CSS with breakpoints at 768px and 1024px
- Preconnect hints for `gstatic.com` and `googletagmanager.com`

## Files

```
index.html                      — App shell, 10 tab panels, modal, toast container
assets/css/styles.css           — All styles, CSS variables, responsive breakpoints
assets/js/app.js                — Application logic (App.Utils through App.DnD)
assets/js/i18n.js               — App object init, translations (Polish + English), i18n engine
assets/img/favicon-*.png        — Shuttlecock favicons (16px, 96px, 192px, 512px)
manifest.json                   — PWA manifest (name, icons, theme)
service-worker.js               — Offline-first cache for app shell
hooks/pre-commit                — Auto-stamps version, cache-bust params, SW version
package.json                    — npm start script (python3 http.server)
```

**Load order:** `FIREBASE_CONFIG` (inline in head) → Firebase SDK (CDN, defer) → `assets/js/i18n.js` (defer) → `assets/js/app.js` (defer) → service worker registration

### Service Worker
- Caches app shell (HTML, CSS, JS, icons, manifest) for offline use
- Strategy: stale-while-revalidate (serve from cache, update in background)
- `CACHE_VERSION` in `service-worker.js` is auto-bumped by pre-commit hook when app files change
- External resources (Firebase CDN, Analytics) are network-only — not cached

## How to Run

Open `index.html` in a browser. That's it. No server required.

Or use a local server:
```bash
npm start
```

## Development Workflow

### Before every commit:
```bash
npm run validate   # runs syntax check + tests + lighthouse
```

### Rules:
- Every new feature must be covered with tests
- README and CLAUDE.md must be updated when adding features
- All tests must pass before committing
- `App.VERSION` and `?v=` cache-busting params are auto-stamped by the pre-commit hook — no manual update needed
- Git hooks live in `hooks/` (tracked). After cloning, run: `git config core.hooksPath hooks`
- Lighthouse scores must stay at 100 across all categories. `npm run validate` runs Lighthouse after tests.

### Performance (CLS prevention):
- All visible-on-load HTML elements must have default content in the HTML to avoid layout shift when JS populates them via `i18n.apply()` or `renderBoard()`
- Tab buttons in `<nav>` must have default Polish text (e.g. `<button data-i18n="tabBoard">Tablica</button>`)
- `#boardCourts` must have placeholder court cards matching the default 4-court layout — JS replaces them via `innerHTML`
- Any new above-the-fold `data-i18n` elements should include default Polish text inline

### Testing:
```bash
npm test           # run all tests
npm run check      # syntax check only
npm run validate   # check + test + lighthouse
```

Tests use Node.js built-in `node:test` runner (no npm dependencies). Test files are in `test/` directory. Browser APIs are mocked in `test/helpers.js`.

## Architecture

Single global `App` object (created in `assets/js/i18n.js`) with modules:

| Module         | Purpose                                          |
|----------------|--------------------------------------------------|
| `App.i18n`     | Internationalization (Polish + English)           |
| `App.Analytics`| Google Analytics event tracking wrapper             |
| `App.Utils`    | ID generation, date/time formatting               |
| `App.Storage`  | localStorage read/write, JSON export/import, state migration |
| `App.Session`  | Session create/reset, court initialization         |
| `App.Players`  | Add/remove/remove-all players, mark present/absent, wishes |
| `App.Queue`    | Waiting queue CRUD, reorder, move to end           |
| `App.Courts`   | Start/finish/cancel games, pair stats, score tracking |
| `App.Matches`  | Match history, filtering, undo last match          |
| `App.Suggest`  | Auto-suggestion algorithm for next 4 players       |
| `App.Lock`     | Session lock/unlock, auto-lock timer               |
| `App.Sync`     | Firebase Realtime Database sync                    |
| `App.UI`       | All rendering, event binding, modals, toasts       |
| `App.DnD`      | Drag-and-drop (mouse + touch) for queue reorder    |

## Tabs (8 total)

| Tab       | Panel ID        | Mode        | Purpose                        |
|-----------|-----------------|-------------|--------------------------------|
| Board     | panel-board     | Both        | Player-facing court view       |
| Players   | panel-players   | Both        | Add/remove, mark present       |
| Results   | panel-results   | Both        | Leaderboard (wins, points)     |
| Courts    | panel-courts    | Admin only  | Court management, start games  |
| Queue     | panel-queue     | Admin only  | Queue management, reorder      |
| History   | panel-history   | Admin only  | Match history, filters, undo   |
| Session   | panel-dashboard | Admin only  | Stats, settings, lock, actions |
| Debug     | panel-debug     | Admin only  | State inspector, clear storage |

## Key Concepts

### Emoji Name Disambiguation
When adding a player whose name already exists (case-insensitive), an emoji picker appears below the input with animal emojis (🐶🐱🐰🦊🐼🐸...). Tapping one adds the player as e.g. "Ola 🐶". A "skip" option allows adding the duplicate name as-is. Hidden when not needed — no distraction for normal flow.

### Living Queue
Players arrive and get a sequential number (#1, #2, ...). New players (0 games played) are inserted ahead of players who have already played, so latecomers get to play sooner. After a game finishes, all 4 players go to the **end** of the queue. Queue position is the primary factor for next game selection.

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
- **Board** (player-facing): Courts with teams + timer, queue list with games played counter and live wait timer, results. One-tap "Finish" with score input.
- **Management** (admin): Full control — all 10 tabs, add/remove players, manual player selection, settings.

Toggle between modes with the gear icon in the header. Help button (`?`) in header shows quick instructions modal (translated) with app version in the footer.

Header layout (left to right): title, lock indicator (🔒) | language switcher, wake lock (☀), fullscreen (⛶), help (?), mode toggle (⚙), sync indicator (●).

### Screen Wake Lock
- Toggle button (☀) in header keeps the tablet screen on during sessions
- Uses the Screen Wake Lock API — hidden on browsers that don't support it
- Auto-reacquires the lock when the tab becomes visible again

### Score Tracking
- Finish confirmation modal with optional score input (e.g. 21:15)
- If score provided: wins/losses and points scored/conceded tracked per player
- Results tab shows leaderboard sorted by wins → win rate → point differential
- Click any player row to open detailed stats modal: overview, favorite partner, best pair (min 2 games, win rate), most common opponent, head-to-head W/L table

### i18n (Internationalization)
- Two languages: Polish (default) and English
- Static text uses `data-i18n` attributes on HTML elements (also `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-opt`)
- Dynamic text uses `App.t('key')` function calls
- Pluralization via `App.i18n.plural(n, {one, few, many, other})` — handles Polish grammar (1→one, 2-4→few, 5+→many)
- `App.tGames(n)` shortcut for games plural (e.g., "1 gra", "2 gry", "5 gier")
- Language preference saved in `localStorage` (`badminton_lang`)
- UI mode (admin/player) saved in `localStorage` (`badminton_mode`), restored on refresh
- Switcher in header with flag buttons

### Session Lock
- Manual lock/unlock button on Session tab — disables all mutation actions (add/remove players, start/finish games, queue reorder, drag-and-drop)
- Optional auto-lock time picker ("Auto-lock at") — session locks automatically when the specified time is reached
- Optional "Clear queue on lock" checkbox — empties the waiting queue (keeps player list) when session is locked manually or via auto-lock
- When locked: header turns red (#b91c1c), lock icon (🔒) appears in header
- Viewing tabs (Board, Results, History) remain fully functional
- Admin can unlock anytime; non-admin sees red header + lock icon
- Lock state syncs across devices via Firebase
- CSS `body.session-locked` class disables action buttons globally; JS guards provide defense in depth

### Firebase Sync
- Admin creates a session on Session tab, shares the link
- Shareable URL with `?session=` parameter for auto-join
- Join (URL or button) checks session existence first via `ref.once('value')` — rejects if not found
- `init()` accepts optional callback for async join result
- Config inlined in `index.html` `<head>` (public by design for web apps)
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
  settings: { courtNumbers, syncEnabled, syncSessionId, locked, autoLockTime, clearQueueOnLock },
  nextPlayerNumber: 1,
  isAdmin: true
}
```

**Player:** `{ id, number, name, present, gamesPlayed, lastGameEndTime, queueEntryTime, partnerHistory, opponentHistory, wishedPartners: [id, ...], wishesFulfilled: [id, ...], wins, losses, pointsScored, pointsConceded, totalWaitTime, waitCount }`

**Court:** `{ id, displayNumber, active, occupied, currentMatch, gameStartTime }`

**Match:** `{ id, startTime, endTime, courtId, teamA: [id,id], teamB: [id,id], score, status }`
