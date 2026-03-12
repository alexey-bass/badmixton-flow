#!/usr/bin/env node
// Full session simulation with configurable parameters
// Usage: node test/simulation.js [--courts N] [--players N] [--late N] [--rounds N]
// Defaults: 4 courts, 17 players, 2 late arrivals, 10 rounds
// Generates an HTML report (open in browser, print to PDF)

var path = require('path');
var fs = require('fs');
var { loadApp } = require('./helpers');

// --- Parse CLI args ---
var args = process.argv.slice(2);
function getArg(name, def) {
  var idx = args.indexOf('--' + name);
  if (idx === -1) return def;
  var val = parseInt(args[idx + 1], 10);
  return isNaN(val) ? def : val;
}

var NUM_COURTS = getArg('courts', 4);
var NUM_PLAYERS = getArg('players', 17);
var NUM_LATE = getArg('late', 2);
var NUM_ROUNDS = getArg('rounds', 10);

if (NUM_PLAYERS < 4) { console.error('Need at least 4 players'); process.exit(1); }
if (NUM_LATE >= NUM_PLAYERS) { console.error('Late arrivals must be fewer than total players'); process.exit(1); }
if (NUM_COURTS < 1) { console.error('Need at least 1 court'); process.exit(1); }

var App = loadApp();

// Mock Date.now to control time
var _fakeNow = Date.now();
var _realDateNow = Date.now;
Date.now = function() { return _fakeNow; };
function advanceMinutes(m) { _fakeNow += m * 60 * 1000; }
function advanceSeconds(s) { _fakeNow += s * 1000; }

// --- Setup ---
localStorage.clear();
App.Session.create();
var courtNumbers = [];
for (var cn = 1; cn <= NUM_COURTS; cn++) courtNumbers.push(cn);
App.Session.initCourts(courtNumbers);

var POOL = [
  'Aleksy', 'Bartek', 'Celina', 'Darek', 'Ewa',
  'Filip', 'Gosia', 'Henryk', 'Iza', 'Jakub',
  'Kasia', 'Leon', 'Magda', 'Norbert', 'Ola',
  'Patryk', 'Renata', 'Szymon', 'Teresa', 'Urszula',
  'Wiktor', 'Xena', 'Yola', 'Zenon', 'Adam',
  'Beata', 'Cyprian', 'Dorota', 'Emil', 'Faustyna'
];

var NAMES = POOL.slice(0, NUM_PLAYERS);
var NUM_ON_TIME = NUM_PLAYERS - NUM_LATE;

// Add all players
var playerIds = NAMES.map(function(name) {
  return App.Players.add(name);
});

// Mark on-time players present
for (var i = 0; i < NUM_ON_TIME; i++) {
  App.Players.markPresent(playerIds[i]);
  advanceSeconds(10);
}

var courtIds = courtNumbers.map(function(n) { return 'c_' + n; });
var matchLog = [];
var roundNum = 0;
var lateArrivals = []; // { name, afterRound }

function runRound() {
  roundNum++;
  for (var ci = 0; ci < courtIds.length; ci++) {
    var courtId = courtIds[ci];
    var court = App.state.courts[courtId];
    if (court.occupied) continue;

    var suggestion = App.Suggest.forCourt(courtId);
    if (!suggestion || !suggestion.players) continue;

    var matchId = App.Courts.startGame(courtId, suggestion.teamA, suggestion.teamB);
    if (!matchId) continue;
  }

  advanceMinutes(8 + Math.floor(Math.random() * 8));

  for (var ci2 = 0; ci2 < courtIds.length; ci2++) {
    var courtId2 = courtIds[ci2];
    var court2 = App.state.courts[courtId2];
    if (!court2.occupied) continue;

    var winScore = 21;
    var loseScore = Math.floor(Math.random() * 16) + 5;
    var scoreStr = winScore + '-' + loseScore;
    if (Math.random() < 0.5) scoreStr = loseScore + '-' + winScore;

    var match = App.state.matches[court2.currentMatch];
    matchLog.push({
      round: roundNum,
      courtId: courtId2,
      courtNum: court2.displayNumber,
      teamA: match.teamA.slice(),
      teamB: match.teamB.slice(),
      score: scoreStr,
      startTime: match.startTime
    });

    App.Courts.finishGame(courtId2, scoreStr);
    advanceSeconds(30);
  }
}

// --- Run simulation with late arrivals spread across early rounds ---
var lateInterval = NUM_LATE > 0 ? Math.max(1, Math.floor(NUM_ROUNDS / (NUM_LATE + 1))) : 0;
var nextLateIdx = 0;

for (var r = 1; r <= NUM_ROUNDS; r++) {
  // Check if a late player arrives before this round
  if (nextLateIdx < NUM_LATE && r === (nextLateIdx + 1) * lateInterval) {
    var lateIdx = NUM_ON_TIME + nextLateIdx;
    advanceMinutes(2 + nextLateIdx * 3);
    App.Players.markPresent(playerIds[lateIdx]);
    lateArrivals.push({ name: NAMES[lateIdx], afterRound: r - 1 });
    nextLateIdx++;
  }
  runRound();
}

// Mark any remaining late players who didn't get a slot
while (nextLateIdx < NUM_LATE) {
  var lateIdx2 = NUM_ON_TIME + nextLateIdx;
  App.Players.markPresent(playerIds[lateIdx2]);
  lateArrivals.push({ name: NAMES[lateIdx2], afterRound: roundNum });
  nextLateIdx++;
}

// --- Collect stats ---
var players = Object.values(App.state.players).filter(function(p) { return p.present; });
players.sort(function(a, b) {
  if (b.wins !== a.wins) return b.wins - a.wins;
  var aRate = a.gamesPlayed ? a.wins / a.gamesPlayed : 0;
  var bRate = b.gamesPlayed ? b.wins / b.gamesPlayed : 0;
  if (bRate !== aRate) return bRate - aRate;
  var aDiff = a.pointsScored - a.pointsConceded;
  var bDiff = b.pointsScored - b.pointsConceded;
  return bDiff - aDiff;
});

var finishedMatches = App.Matches.getFinished();

function playerName(id) {
  return App.state.players[id] ? App.state.players[id].name : id;
}

function pairKey(id1, id2) {
  var n1 = playerName(id1), n2 = playerName(id2);
  return n1 < n2 ? n1 + ' & ' + n2 : n2 + ' & ' + n1;
}

// Build pair matrix
var pairMap = {};
finishedMatches.forEach(function(m) {
  var scoreParts = m.score ? m.score.split('-').map(Number) : [0, 0];
  var aWon = scoreParts[0] > scoreParts[1];

  var kA = pairKey(m.teamA[0], m.teamA[1]);
  if (!pairMap[kA]) pairMap[kA] = { played: 0, wins: 0 };
  pairMap[kA].played++;
  if (aWon) pairMap[kA].wins++;

  var kB = pairKey(m.teamB[0], m.teamB[1]);
  if (!pairMap[kB]) pairMap[kB] = { played: 0, wins: 0 };
  pairMap[kB].played++;
  if (!aWon) pairMap[kB].wins++;
});

var pairs = Object.keys(pairMap).map(function(k) {
  return { pair: k, played: pairMap[k].played, wins: pairMap[k].wins };
});
pairs.sort(function(a, b) {
  if (b.played !== a.played) return b.played - a.played;
  return b.wins - a.wins;
});

// Build late arrivals lookup
var lateMap = {};
lateArrivals.forEach(function(la) { lateMap[la.name] = la.afterRound; });

// --- Generate HTML report ---
var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
html += '<title>Badmixton Flow — Session Report</title>';
html += '<style>';
html += 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; color: #1e293b; }';
html += 'h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }';
html += 'h2 { color: #334155; margin-top: 32px; }';
html += 'table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; font-size: 14px; }';
html += 'th { background: #2563eb; color: white; padding: 8px 10px; text-align: left; }';
html += 'td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }';
html += 'tr:nth-child(even) { background: #f8fafc; }';
html += 'tr:hover { background: #e0e7ff; }';
html += '.late { color: #b45309; font-style: italic; }';
html += '.summary { display: flex; gap: 20px; flex-wrap: wrap; margin: 16px 0; }';
html += '.stat-card { background: #f1f5f9; border-radius: 8px; padding: 12px 20px; min-width: 120px; }';
html += '.stat-card .val { font-size: 28px; font-weight: 700; color: #2563eb; }';
html += '.stat-card .label { font-size: 12px; color: #64748b; }';
html += '.win { color: #16a34a; font-weight: 600; }';
html += '.loss { color: #dc2626; }';
html += '.params { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 16px; font-size: 13px; color: #64748b; margin: 8px 0 16px; }';
html += '@media print { body { padding: 0; } h1 { font-size: 20px; } table { font-size: 12px; } .stat-card .val { font-size: 22px; } }';
html += '@page { margin: 15mm; }';
html += '</style></head><body>';

html += '<h1>Badmixton Flow — Session Report</h1>';

// Params
html += '<div class="params">Simulation: ' + NUM_PLAYERS + ' players, ' + NUM_COURTS + ' courts, ' + NUM_ROUNDS + ' rounds, ' + NUM_LATE + ' late arrival' + (NUM_LATE !== 1 ? 's' : '');
if (lateArrivals.length > 0) {
  html += ' (';
  html += lateArrivals.map(function(la) { return la.name + ' after round ' + la.afterRound; }).join(', ');
  html += ')';
}
html += '</div>';

// Summary cards
html += '<div class="summary">';
html += '<div class="stat-card"><div class="val">' + players.length + '</div><div class="label">Players</div></div>';
html += '<div class="stat-card"><div class="val">' + finishedMatches.length + '</div><div class="label">Matches</div></div>';
html += '<div class="stat-card"><div class="val">' + NUM_COURTS + '</div><div class="label">Courts</div></div>';
html += '<div class="stat-card"><div class="val">' + roundNum + '</div><div class="label">Rounds</div></div>';
html += '</div>';

// Player leaderboard
html += '<h2>Player Leaderboard</h2>';
html += '<table><tr><th>#</th><th>Player</th><th>Games</th><th>W</th><th>L</th><th>Win%</th><th>Pts+</th><th>Pts-</th><th>Diff</th></tr>';
players.forEach(function(p, idx) {
  var rate = p.gamesPlayed ? Math.round(100 * p.wins / p.gamesPlayed) : 0;
  var diff = p.pointsScored - p.pointsConceded;
  var diffStr = diff > 0 ? '+' + diff : '' + diff;
  var lateNote = lateMap[p.name] !== undefined ? ' <span class="late">(after round ' + lateMap[p.name] + ')</span>' : '';
  html += '<tr>';
  html += '<td>' + (idx + 1) + '</td>';
  html += '<td>' + p.name + lateNote + '</td>';
  html += '<td>' + p.gamesPlayed + '</td>';
  html += '<td class="win">' + p.wins + '</td>';
  html += '<td class="loss">' + p.losses + '</td>';
  html += '<td>' + rate + '%</td>';
  html += '<td>' + p.pointsScored + '</td>';
  html += '<td>' + p.pointsConceded + '</td>';
  html += '<td>' + diffStr + '</td>';
  html += '</tr>';
});
html += '</table>';

// Pair stats
html += '<h2>Pair Statistics</h2>';
html += '<table><tr><th>Pair</th><th>Played</th><th>Wins</th><th>Win%</th></tr>';
pairs.forEach(function(p) {
  var rate = p.played ? Math.round(100 * p.wins / p.played) : 0;
  html += '<tr>';
  html += '<td>' + p.pair + '</td>';
  html += '<td>' + p.played + '</td>';
  html += '<td>' + p.wins + '</td>';
  html += '<td>' + rate + '%</td>';
  html += '</tr>';
});
html += '</table>';

// Match log
html += '<h2>Match Log</h2>';
html += '<table><tr><th>Rnd</th><th>Court</th><th>Team A</th><th>Score</th><th>Team B</th></tr>';
matchLog.forEach(function(m) {
  var nameA = playerName(m.teamA[0]) + ', ' + playerName(m.teamA[1]);
  var nameB = playerName(m.teamB[0]) + ', ' + playerName(m.teamB[1]);
  var parts = m.score.split('-').map(Number);
  var aWon = parts[0] > parts[1];
  var scoreDisplay = aWon
    ? '<span class="win">' + parts[0] + '</span>-' + parts[1]
    : parts[0] + '-<span class="win">' + parts[1] + '</span>';
  html += '<tr>';
  html += '<td>' + m.round + '</td>';
  html += '<td>Court ' + m.courtNum + '</td>';
  html += '<td' + (aWon ? ' class="win"' : '') + '>' + nameA + '</td>';
  html += '<td>' + scoreDisplay + '</td>';
  html += '<td' + (!aWon ? ' class="win"' : '') + '>' + nameB + '</td>';
  html += '</tr>';
});
html += '</table>';

// Games per player distribution
html += '<h2>Games Distribution</h2>';
html += '<table><tr><th>Player</th><th>Games</th><th>Bar</th></tr>';
var maxGames = Math.max.apply(null, players.map(function(p) { return p.gamesPlayed; }));
players.sort(function(a, b) { return b.gamesPlayed - a.gamesPlayed; });
players.forEach(function(p) {
  var pct = maxGames ? Math.round(100 * p.gamesPlayed / maxGames) : 0;
  html += '<tr>';
  html += '<td>' + p.name + '</td>';
  html += '<td>' + p.gamesPlayed + '</td>';
  html += '<td><div style="background:#2563eb;height:14px;border-radius:3px;width:' + pct + '%;min-width:2px"></div></td>';
  html += '</tr>';
});
html += '</table>';

html += '<p style="color:#94a3b8;font-size:11px;margin-top:32px">Generated by Badmixton Flow simulation &middot; ' + new Date().toISOString().split('T')[0] + '</p>';
html += '</body></html>';

var outPath = path.resolve(__dirname, '..', 'simulation-report.html');
fs.writeFileSync(outPath, html);

// Restore Date.now
Date.now = _realDateNow;

console.log('Simulation complete!');
console.log('  Players: ' + players.length + ' (' + NUM_ON_TIME + ' on time, ' + NUM_LATE + ' late)');
console.log('  Courts:  ' + NUM_COURTS);
console.log('  Matches: ' + finishedMatches.length);
console.log('  Rounds:  ' + roundNum);
console.log('  Pairs:   ' + pairs.length);
console.log('  Report:  ' + outPath);
