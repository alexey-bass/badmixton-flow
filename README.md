# Badmixton Flow — Badminton 2x2 Queue Manager

Web app for managing player queues and court assignments during amateur badminton doubles sessions. Designed for a coach or admin running sessions with 4–20 players on 1–5 courts.

**Primary device:** 12" tablet placed courtside. Also works on phones and desktops.

## Features

- **Player management** — add, remove, mark present/absent, multiple partner wishes
- **Living queue** — automatic arrival numbering, auto-requeue after each game
- **Smart suggestions** — algorithm picks next 4 players based on queue position, games balance, and wishes
- **Court management** — 1–5 configurable courts, finish confirmation with optional score
- **Team splitting** — minimizes pair/opponent repeats, respects wish pairings, custom swap option with bench
- **Score tracking** — optional score input on game finish, win/loss and points per player
- **Results leaderboard** — ranked by wins, win rate, and point differential
- **Session highlights** — fun stats: most active, win streak, top scorer, social butterfly, rivals
- **Match history** — filterable by court and player, with undo
- **Drag-and-drop** — reorder queue manually (mouse + touch)
- **Two UI modes** — Board (player-facing: courts, queue, results) and Management (admin: full control)
- **Multi-device sync** — Firebase Realtime Database, shareable session links with auto-join
- **Quick help** — in-app instructions modal, translated
- **i18n** — Polish (default) and English
- **JSON export/import** — backup and restore session data
- **Analytics** — Google Analytics event tracking for user flow analysis
- **Debug tools** — session inspector, localStorage viewer, clear data

## Quick Start

Open `index.html` in a browser. No server, no build tools, no npm required.

For local development:

```bash
npm start
# or
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Project Structure

```
index.html                      — App shell, 10 tab panels, modals
assets/css/styles.css           — All styles, CSS variables, responsive breakpoints
assets/js/app.js                — Application logic
assets/js/i18n.js               — Translations (Polish + English) and i18n engine
assets/js/firebase-config.js    — Firebase and Google Analytics configuration
assets/img/favicon-*.png        — Shuttlecock favicons (16px, 96px)
package.json                    — npm start script for local dev server
CLAUDE.md                       — AI assistant context (architecture, data model)
PLAN.md                         — Development roadmap
```

## How It Works

### Living Queue

Players arrive and get a sequential number (#1, #2, ...). New players who haven't played yet are promoted ahead of those who have, so latecomers get to play sooner. After a game finishes, all 4 players go to the end of the queue. Queue position is the primary factor for who plays next.

### Suggestion Algorithm

Picks the best 4 players by scoring each candidate:
- Queue position (highest priority)
- Games above average penalty (fairness)
- Unfulfilled wish bonus

Then splits them into two teams minimizing:
- Pair repeat penalty
- Opponent repeat penalty
- While maximizing wish fulfillment

Three algorithmic split options are shown, plus a **Custom** option where players can tap to swap teammates between teams or bring in anyone from the queue bench.

### Score Tracking

When finishing a game, a confirmation modal lets you optionally enter the score (e.g. 21:15). If entered, wins/losses and points are tracked per player and shown on the Results leaderboard.

### Two Modes

- **Board mode** (toggle via gear icon) — clean view for players: courts with teams + timer, queue list, results leaderboard
- **Management mode** — full admin control: all tabs, player management, manual selection, settings, sync, debug

### Multi-Device Sync

1. Go to the **Sync** tab
2. Click **Create session** (generates a session ID like `badminton-2026-03-10`). Use the 🎲 button to add a random salt for harder-to-guess IDs
3. Copy the share link and send it to players
4. Anyone opening the link auto-joins the session and sees live updates

Sync uses Firebase Realtime Database. Configuration is in `assets/js/firebase-config.js`.

## Tech Stack

- Pure HTML / CSS / JavaScript — no frameworks, no build tools
- Firebase Realtime Database v10.12.0 (compat SDK, loaded via CDN)
- `localStorage` for persistence
- Google Analytics (gtag.js)
- Mobile-first responsive CSS

## License

All rights reserved. Contact the author for permission to use this software. See [LICENSE](LICENSE) for details.
