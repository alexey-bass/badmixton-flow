# Badminton 2x2 — Development Plan

## Phase 1: MVP (DONE)

- [x] Three-file structure: index.html, styles.css, app.js
- [x] Pure HTML/CSS/JS, no frameworks, no build tools
- [x] localStorage persistence (survives page refresh)
- [x] Player management: add, remove, mark present/absent
- [x] Living queue: arrival numbering, auto-requeue after game
- [x] Court management: 1-5 configurable courts
- [x] One-tap game start/finish per court (all 4 players update)
- [x] Auto-suggestion algorithm (queue position + games balance + wishes)
- [x] Team split scoring (pair repeats, opponent repeats, wish bonus)
- [x] Manual player selection for courts
- [x] Match history with court/player filters
- [x] Undo last match
- [x] Two UI modes: Board (player-facing) and Management (admin)
- [x] Mobile-first responsive design (phone, 12" tablet, desktop)
- [x] Drag-and-drop queue reorder (mouse + touch)
- [x] JSON export/import
- [x] Session create/reset

## Phase 2: i18n (DONE)

- [x] Polish language (default)
- [x] English language
- [x] Language switcher in header with flag buttons
- [x] `data-i18n` attributes for static HTML text
- [x] `App.t()` function for dynamic strings
- [x] Language preference saved in localStorage
- [x] All Russian comments in code replaced with English

## Phase 3: Multi-Device Sync (DONE)

- [x] Firebase Realtime Database sync (room create/join)
- [x] Separate Sync tab with room management
- [x] Shareable join URL with `?room=` parameter (auto-join on open)
- [x] Copy link button for easy sharing
- [x] Firebase config in separate `firebase-config.js`
- [x] i18n extracted to separate `i18n.js`
- [x] Google Analytics (gtag.js)

## Phase 4: Score Tracking & Results (DONE)

- [x] Finish game confirmation modal with optional score input
- [x] Score stored on match record (e.g., "21-15")
- [x] Win/loss tracking per player
- [x] Points scored/conceded tracking per player
- [x] Results/Leaderboard tab (sorted by wins, win rate, point diff)
- [x] Results tab visible in both admin and player modes
- [x] Data migration for existing players (auto-adds new fields)

## Phase 5: Debug & Stability (DONE)

- [x] Debug tab: session state, sync state, localStorage inspector
- [x] Clear localStorage with confirmation
- [x] `_ensureState` migration for corrupted/incomplete data
- [x] Robust player field initialization

## Phase 6: Polish & UX Improvements (DONE)

- [x] Show game count next to player name on Board queue
- [x] Improve touch drag-and-drop smoothness (rAF throttling)
- [x] Emoji animal picker for duplicate player name disambiguation
- [x] Screen wake lock (keep tablet display on)
- [x] Sync indicator blink on data send/receive
- [x] Google Analytics event tracking (emoji, player, fullscreen, sync, DnD, etc.)
- [x] Session highlights (most active, win streak, top scorer, rivals, etc.)
- [x] Custom team swap with bench players
- [x] Accessibility: i18n tooltips, label-input linking, html lang, border transitions

## Phase 7: Advanced Statistics

- [x] Session highlights (most active, win streak, top scorer, social butterfly, rivals, most patient)
- [x] Player statistics modal (games, W/L, win rate, points, avg wait)
- [x] Head-to-head stats between players (W/L record per opponent)
- [x] "Best pair" and "most common opponents" insights (favorite partner, best pair by win rate)
- [ ] Session comparison across days
- [ ] Charts/graphs for trends

## Phase 8: PWA & Offline (DONE)

- [x] Service Worker for offline support (stale-while-revalidate)
- [x] Web App Manifest (installable on home screen)
- [x] Offline-first with sync on reconnect
- [x] App icons (96px, 192px, 512px)
- [x] Pre-commit hook auto-stamps version, bumps cache-bust params, SW version

## Phase 9: UX Improvements

- [ ] Fix session date display to use localized day names
- [ ] Add "mark all present" bulk action button
- [ ] Add player search/filter on Players tab
- [ ] Score display in match history
- [ ] Add confirmation toast with undo option (instead of modal confirm)
- [ ] Add haptic feedback on mobile (vibrate API)
- [ ] Add session name display on Board tab

## Phase 10: Multi-Device Experience

- [ ] QR code generation for room join link
- [ ] Player self-check-in via phone (scan QR, tap "I'm here")
- [ ] Real-time board view for spectators
- [ ] Push notifications (game starting, your turn coming up)
- [ ] WhatsApp share button for room link

## Phase 11: Advanced Features

- [ ] Tournament mode (round-robin, knockout brackets)
- [ ] Skill rating system (ELO-like)
- [ ] Automatic court assignment based on skill balance
- [ ] Rest time tracking (minimum break between games)
- [ ] Custom game duration timer with alerts
- [ ] Multiple session templates (Friday evening, Sunday morning, etc.)
- [ ] Admin password protection
- [ ] Data export to CSV/Excel
