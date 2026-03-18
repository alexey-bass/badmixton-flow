# Badmixton Flow — Badminton 2v2, 2v1 & 1v1 Manager

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
assets/js/app.js                — Application logic (App.Utils through App.Shuffle, App.DnD)
assets/js/i18n.js               — App object init, translations (Polish + English), i18n engine
assets/img/favicon-*.png        — Shuttlecock favicons (16px, 96px, 192px, 512px)
manifest.json                   — PWA manifest (name, icons, theme)
service-worker.js               — Offline-first cache for app shell
hooks/pre-commit                — Auto-stamps version, cache-bust params, SW version
package.json                    — npm start script (python3 http.server)
ALGO.md                         — Algorithm documentation with scoring weights, examples, quality criteria
test/                           — Node.js tests (node:test runner), mocks in test/helpers.js
scripts/                        — Screenshots (Playwright), simulation, and validation scripts
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
npm run validate   # runs syntax check + tests + simulation quality check + lighthouse
```

### Rules:
- Every new feature or bug fix must have a GitHub issue (create one if not exists), closed when done (use `Fixes #N` in commit message)
- Every new feature must be covered with tests
- README and CLAUDE.md must be updated when adding features
- All tests must pass before committing
- `App.VERSION` and `?v=` cache-busting params are auto-stamped by the pre-commit hook — no manual update needed
- Git hooks live in `hooks/` (tracked). After cloning, run: `git config core.hooksPath hooks`
- Lighthouse scores must stay at 100 across all categories. `npm run validate` runs Lighthouse after tests.
- Shuffle algorithm must pass quality criteria (see ALGO.md). `npm run validate` runs 10 simulations after tests.

### Long Player Names:
- Player names are truncated with CSS `text-overflow: ellipsis` in player list (`.player-name`), board queue (`.bq-name`), board court cards (`.board-team > span`), and admin courts (`.team > span`)
- Truncation is dynamic — based on available pixel width, no character limit

### Performance (CLS prevention):
- All visible-on-load HTML elements must have default content in the HTML to avoid layout shift when JS populates them via `i18n.apply()` or `renderBoard()`
- Tab buttons in `<nav>` must have default Polish text (e.g. `<button data-i18n="tabBoard">Tablica</button>`)
- `#boardCourts` must have placeholder court cards matching the default 4-court layout — JS replaces them via `innerHTML`
- Any new above-the-fold `data-i18n` elements should include default Polish text inline

### Testing:
```bash
npm test           # run all tests
npm run check      # syntax check only
npm run validate   # check + test + simulation quality + lighthouse
```

Tests use Node.js built-in `node:test` runner (no npm dependencies). Test files are in `test/` directory. Browser APIs are mocked in `test/helpers.js`.

### Simulation:
```bash
npm run simulation                                                    # queue mode: 4 courts, 17 players, 2 late, 10 rounds, en
npm run simulation -- --courts 2 --players 10 --late 1 --rounds 5     # custom params
npm run simulation -- --lang pl                                       # Polish report
npm run simulation:shuffle                                            # shuffle mode: 4 courts, 17 players, 2 late, 10 rounds
npm run simulation:shuffle -- --courts 4 --players 17 --rounds 10 --lang pl --output report.html
npm run simulation:validate                                           # run 10 shuffle simulations, check quality criteria
```

Queue simulation generates `simulation-report.html`, shuffle generates `simulation-shuffle-report.html`. Both support `--lang pl|en`. Open in browser and print to PDF.

`simulation:validate` runs 10 shuffle-mode simulations and checks algorithm quality criteria (see ALGO.md): no partner pair repeats, no frequent opponents, no group regrouping, fair games distribution, late player fairness. Included in `npm run validate`.

### Screenshots:
```bash
npm run screenshots      # regenerate all screenshots in screenshots/
npm run screenshot:print # print schedule screenshot (shuffle 13/3, 11 rounds)
```

Uses Playwright (Chromium) to capture each tab at 768×1024 @2x. PNGs are auto-optimized with `pngquant` (lossy, ~70% smaller); skipped gracefully if not installed (`brew install pngquant`). The script (`scripts/screenshots.js`) starts a local server, seeds demo data (12 players, finished matches, active games), and captures:
- `01-board` — Board tab in player mode: 4 courts (2v2, 2v1, 1v1, empty); queue mode shows queue sidebar, shuffle mode shows round-based upcoming games below
- `02-players` — Players tab in admin mode
- `03-results` — Results leaderboard + session highlights in player mode
- `04-queue` — Queue tab in admin mode
- `05-courts` — Courts tab in admin mode
- `06-session` — Session tab in admin mode
- `07-history` — History tab in admin mode
- `08-help` — Help modal overlay
- `09-print-schedule` — Print schedule A4 page (shuffle mode, 13 players, 3 courts, 11 rounds)

When adding new tabs or modals, add an entry to the `TABS` array in the script. Screenshots are committed to `screenshots/` and referenced in README.

## Architecture

Single global `App` object (created in `assets/js/i18n.js`) with modules:

| Module         | Purpose                                          |
|----------------|--------------------------------------------------|
| `App.i18n`     | Internationalization (Polish + English)           |
| `App.Analytics`| Google Analytics event tracking wrapper             |
| `App.Utils`    | ID generation, date/time formatting               |
| `App.Storage`  | localStorage read/write, JSON export/import, state migration |
| `App.Session`  | Session create/reset, court initialization         |
| `App.Players`  | Add/remove/remove-all/rename/renumber players, mark present/absent, wishes |
| `App.Queue`    | Waiting queue CRUD, reorder, move to end           |
| `App.Courts`   | Start/finish/cancel games, pair stats, score tracking |
| `App.Matches`  | Match history, filtering, undo last match          |
| `App.Suggest`  | Auto-suggestion algorithm for next 2-4 players     |
| `App.Shuffle`  | Shuffle mode: batch game generation & scheduling   |
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
| History   | panel-history   | Both        | Match history, filters; undo admin-only |
| Session   | panel-dashboard | Admin only  | Stats, settings, lock, actions |
| Debug     | panel-debug     | Admin only  | State inspector, clear storage |

## Key Concepts

### Edit Player Name
Pencil button (✎) on each player row opens a rename modal with text input and an emoji toggle button (🐾). Tapping an emoji appends it to the name. Rename preserves all player stats, queue position, and history — only the name field changes.

### Renumber Players
"Renumber" button (admin-only, Players tab) renumbers all present players sequentially from #1, preserving their original arrival order. Absent players lose their numbers (reset to 0) and get new ones when marked present again. Confirmation dialog warns about this. Safe to use mid-session — game logic uses player IDs, not numbers.

### Emoji Name Disambiguation
When adding a player whose name already exists (case-insensitive), an emoji picker appears below the input with animal emojis (🐶🐱🐰🦊🐼🐸...). Tapping one adds the player as e.g. "Ola 🐶". A "skip" option allows adding the duplicate name as-is. Hidden when not needed — no distraction for normal flow.

### Session Modes

Two modes, chosen at session creation:

- **Queue mode** (default): Players join a waiting queue, coach suggests/selects players per court, finished players return to queue end. Traditional flow.
- **Shuffle mode**: Coach generates a batch of games upfront via smart algorithm. Games auto-assign to free courts in strict schedule order — if the next pending game has players busy on other courts, the court waits rather than skipping ahead. Board tab shows courts full-width (no sidebar), with upcoming games and bench displayed below in a round-based layout: games are grouped into rounds (courtCount consecutive games), each round's game cards align to the court grid columns, bench ("Pauza") players are shown centered per round, and rounds are separated by divider lines. Bench is computed per-round from the original schedule, staying stable even when games from the next round are assigned early to a freed court. Free courts preview the next pending game (no duplicates across courts) and show random motivational/funny phrases (20 per language) instead of "Waiting for schedule...". Upcoming game cards use the same blue (#dbeafe) / yellow (#fef3c7) team background colors as court cards. Schedule tab replaces Queue tab. "Create game" button lets coach manually pick 2-4 players and add a custom game to the schedule. Pending games can be edited: swap players between teams/bench, or remove players from a team (click to select, click again to remove) to convert 2v2 → 2v1 → 1v1. "Print" button generates an A4-friendly page with player roster, game table grouped by rounds, bench column (when players > courts can fit), and empty Court/Score columns for handwriting. Works when session is locked.

Mode stored as `state.mode` ('queue' | 'shuffle'). Schedule stored as `state.schedule[]` with entries: `{ id, teamA, teamB, status, courtId, matchId }`. Status lifecycle: `pending` → `ready` (assigned to court) → `playing` → `finished`.

See [ALGO.md](ALGO.md) for detailed algorithm description with scoring weights and examples.

### Living Queue
Players arrive and get a sequential number (#1, #2, ...). New players (0 games played) are inserted ahead of players who have already played, so latecomers get to play sooner. After a game finishes, all players return to the **end** of the queue. Queue position is the primary factor for next game selection.

### Game Formats
- **2v2** (default) — 4 players, standard doubles
- **2v1** — 3 players, when not enough for 2v2
- **1v1** — 2 players, when not enough for 2v1

The suggestion algorithm picks the best available format based on queue size. Teams of 1-2 players each. Partner history is only tracked for 2-player teams. All formats support score tracking, results, and undo.

### Suggestion Algorithm
Picks players by scoring (queue position, games balance, wishes), diversifies to avoid re-grouping, then splits into teams minimizing partner/opponent repeats. Supports custom tap-to-swap in the suggestion modal. See [ALGO.md](ALGO.md) for full scoring weights and examples.

### Two UI Modes
- **Board** (player-facing): Courts with teams + timer, results. In queue mode: right sidebar with queue list (games played counter, live wait timer). In shuffle mode: full-width courts with round-based upcoming games and bench below. One-tap "Finish" with score input.
- **Management** (admin): Full control — all 10 tabs, add/remove players, manual player selection, settings.

Toggle between modes with the gear icon in the header. Help button (`?`) in header shows quick instructions modal (translated) with app version in the footer.

Header layout (left to right): title + session name, lock indicator (🔒) | language switcher, wake lock (☀), fullscreen (⛶), zoom (1x), help (?), mode toggle (⚙), sync indicator (●).

### Session Name
- Optional custom name set when creating a new session or edited by clicking the name in the header
- Displayed in the header bar after "Badmixton Flow" (e.g. "Badmixton Flow — Thursday training")
- Hidden when empty — header shows just "Badmixton Flow"
- Stored as `state.name`

### Screen Wake Lock
- Toggle button (☀) in header keeps the tablet screen on during sessions
- Uses the Screen Wake Lock API — hidden on browsers that don't support it
- Auto-reacquires the lock when the tab becomes visible again

### UI Zoom
- Zoom selector (1x / 1.25x / 1.5x / 2x) on Session tab for large screens (e.g. Smart TV)
- Uses CSS `zoom` on `body` — scales everything uniformly without CSS rewrites
- Stored per device in `localStorage` (`badminton_zoom`), not synced — each device keeps its own zoom level

### Score Tracking
- Finish modal with winner declaration: tap the winning team, declare a draw, or enter a score
- Winner can be declared without entering a score — wins/losses tracked, but no points
- Optional score input always visible below winner buttons (e.g. 21:15)
- If score provided: wins/losses and points scored/conceded tracked per player
- Board court cards have a cancel button (↩) next to Finish for accidentally started games
- Results tab shows leaderboard sorted by wins → win rate → point differential
- Configurable via Session tab: hide Results tab in player mode (`showResults`), limit leaderboard to top 3/5/10 (`resultsLimit`)
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
- Auto-connects to Firebase when creating a new session — no separate "Create session" step
- `App.Sync.autoConnect(sessionId)` polls for Firebase SDK (deferred load) up to 10s, then gives up silently
- Single unified `state.sessionId` used for localStorage, Firebase, and URL (no separate `syncSessionId`)
- Auto-reconnects on page load if `settings.syncEnabled` is true
- Shareable URL with `?session=` parameter for auto-join; share link + copy button shown when connected
- Join: paste session ID into input field, or use the `?session=` URL directly
- Join checks session existence first via `ref.once('value')` — rejects if not found
- `init()` accepts optional callback for async join result
- Config inlined in `index.html` `<head>` (public by design for web apps)
- Falls back to local-only if Firebase SDK not loaded (offline, no network)

### Data Migration
- `App.Storage._ensureState()` validates and fills missing fields on load
- Handles corrupted localStorage, old versions, and Firebase sync data
- Player fields auto-migrated (partnerHistory, wins, losses, points, wishedPartner→wishedPartners, etc.)

## Data Model

Session state stored in `localStorage` as `bs_<sessionId>` (e.g. `bs_bf-x7kQ9m`). Each session gets a unique `sessionId` (auto-generated hash) used for both localStorage and Firebase sync. `bs_last` tracks the most recent key suffix. Index at `bs_index`. URL updates to `?session=<sessionId>` via `history.replaceState`.

```
{
  version: 1,
  sessionId: "bf-x7kQ9m",  // auto-generated unique hash
  date: "2026-03-10",
  name: "",
  mode: "queue",           // "queue" | "shuffle"
  players: { [id]: Player },
  waitingQueue: [playerId, ...],
  courts: { [id]: Court },
  matches: { [id]: Match },
  schedule: [],            // shuffle mode only — ordered list of planned games
  settings: { syncEnabled, locked, autoLockTime, clearQueueOnLock, showResults, resultsLimit },
  nextPlayerNumber: 1,
  isAdmin: true
}
```

**Player:** `{ id, number, name, present, gamesPlayed, lastGameEndTime, queueEntryTime, partnerHistory, opponentHistory, wishedPartners: [id, ...], wishesFulfilled: [id, ...], wins, losses, pointsScored, pointsConceded, totalWaitTime, waitCount }`

**Court:** `{ id, displayNumber, active, occupied, currentMatch, gameStartTime }`

**Match:** `{ id, startTime, endTime, courtId, teamA: [id, ...], teamB: [id, ...], score, winner, status }` — teams have 1-2 players each (supports 1v1, 2v1, 2v2); winner: 'teamA' | 'teamB' | 'draw' | null

**Schedule entry (shuffle mode):** `{ id, teamA: [id, ...], teamB: [id, ...], status, courtId, matchId }` — status: pending → ready → playing → finished
