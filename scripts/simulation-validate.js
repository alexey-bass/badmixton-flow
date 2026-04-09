#!/usr/bin/env node
// Runs 10 shuffle-mode simulations and validates algorithm quality criteria.
// Exit code 0 = all pass, 1 = at least one failure.
// See ALGO.md "Quality criteria" for thresholds.

var path = require('path');
var { loadApp } = require('../test/helpers');

var NUM_RUNS = 10;
var NUM_COURTS = 4;
var NUM_PLAYERS = 17;
var NUM_ROUNDS = 10;
var NUM_LATE = 2;
var LATE_TIMES = [5, 10]; // minutes after session start

var POOL = [
  'Aleksy', 'Bartek', 'Celina', 'Darek', 'Ewa',
  'Filip', 'Gosia', 'Henryk', 'Iza', 'Jakub',
  'Kasia', 'Leon', 'Magda', 'Norbert', 'Ola',
  'Patryk', 'Renata', 'Szymon', 'Teresa', 'Urszula',
  'Wiktor', 'Xena', 'Yola', 'Zenon', 'Adam'
];
var NAMES = POOL.slice(0, NUM_PLAYERS);
var NUM_ON_TIME = NUM_PLAYERS - NUM_LATE;

function runSimulation(seed) {
  var App = loadApp();

  var _fakeNow = Date.now() + seed * 100000;
  var _realDateNow = Date.now;
  Date.now = function() { return _fakeNow; };
  function advanceMinutes(m) { _fakeNow += m * 60 * 1000; }
  function advanceSeconds(s) { _fakeNow += s * 1000; }

  localStorage.clear();
  App.Session.create('Validate ' + seed, 'shuffle');
  var courtNumbers = [];
  for (var cn = 1; cn <= NUM_COURTS; cn++) courtNumbers.push(cn);
  App.Session.initCourts(courtNumbers);

  var playerIds = NAMES.map(function(name) { return App.Players.add(name); });
  for (var i = 0; i < NUM_ON_TIME; i++) {
    App.Players.markPresent(playerIds[i]);
    advanceSeconds(10);
  }

  var courtIds = courtNumbers.map(function(n) { return 'c_' + n; });
  var sessionStartTime = _fakeNow;
  var lateArrived = LATE_TIMES.map(function() { return false; });

  // Initial generation
  App.Shuffle.generate(NUM_COURTS * 2);
  App.Shuffle.autoAssignAll();

  function startReadyGames() {
    courtIds.forEach(function(cid) {
      var court = App.state.courts[cid];
      if (court.occupied) return;
      var entry = App.state.schedule.find(function(e) {
        return e.courtId === cid && e.status === 'ready';
      });
      if (entry) App.Courts.startGame(cid, entry.teamA, entry.teamB);
    });
  }

  function finishAllCourts() {
    courtIds.forEach(function(cid) {
      var court = App.state.courts[cid];
      if (!court.occupied) return;
      var winScore = 21;
      var loseScore = Math.floor(Math.random() * 16) + 5;
      var scoreStr = winScore + '-' + loseScore;
      if (Math.random() < 0.5) scoreStr = loseScore + '-' + winScore;
      App.Courts.finishGame(cid, scoreStr);
      advanceSeconds(30);
    });
  }

  for (var r = 0; r < NUM_ROUNDS; r++) {
    var elapsedMin = (_fakeNow - sessionStartTime) / 60000;

    for (var li = 0; li < NUM_LATE; li++) {
      if (!lateArrived[li] && elapsedMin >= LATE_TIMES[li]) {
        App.Players.markPresent(playerIds[NUM_ON_TIME + li]);
        lateArrived[li] = true;
        App.Shuffle.reshuffle();
        App.Shuffle.autoAssignAll();
      }
    }

    startReadyGames();
    advanceMinutes(8 + Math.floor(Math.random() * 8));
    finishAllCourts();

    var pending = App.state.schedule.filter(function(e) {
      return e.status === 'pending' || e.status === 'ready';
    });
    if (pending.length < NUM_COURTS) {
      App.Shuffle.generate(NUM_COURTS);
      App.Shuffle.autoAssignAll();
    }
  }

  // Collect results
  var players = Object.values(App.state.players).filter(function(p) { return p.present; });
  var finishedMatches = App.Matches.getFinished();

  function pName(id) { return App.state.players[id] ? App.state.players[id].name : id; }

  // Partner pair repeats
  var partnerPairs = {};
  finishedMatches.forEach(function(m) {
    [m.teamA, m.teamB].forEach(function(team) {
      if (team.length === 2) {
        var k = [pName(team[0]), pName(team[1])].sort().join(' & ');
        partnerPairs[k] = (partnerPairs[k] || 0) + 1;
      }
    });
  });
  var repeatedPartners = Object.entries(partnerPairs).filter(function(e) { return e[1] > 1; });

  // Frequent opponents (3+)
  var opponentPairs = {};
  finishedMatches.forEach(function(m) {
    m.teamA.forEach(function(a) {
      m.teamB.forEach(function(b) {
        var k = [pName(a), pName(b)].sort().join(' vs ');
        opponentPairs[k] = (opponentPairs[k] || 0) + 1;
      });
    });
  });
  var frequentOpponents = Object.entries(opponentPairs).filter(function(e) { return e[1] >= 3; });

  // Group regrouping (exact same 4)
  var groupOverlaps = 0;
  for (var a = 0; a < finishedMatches.length; a++) {
    var pidsA = finishedMatches[a].teamA.concat(finishedMatches[a].teamB).map(pName).sort().join(',');
    for (var b = a + 1; b < finishedMatches.length; b++) {
      var pidsB = finishedMatches[b].teamA.concat(finishedMatches[b].teamB).map(pName).sort().join(',');
      if (pidsA === pidsB) groupOverlaps++;
    }
  }

  // Games distribution
  var gamesList = players.map(function(p) { return p.gamesPlayed; });
  var minGames = Math.min.apply(null, gamesList);
  var maxGames = Math.max.apply(null, gamesList);
  var avgGames = gamesList.reduce(function(a, b) { return a + b; }, 0) / gamesList.length;

  // Late player fairness
  var latePlayerGames = [];
  for (var li2 = 0; li2 < NUM_LATE; li2++) {
    var lp = App.state.players[playerIds[NUM_ON_TIME + li2]];
    latePlayerGames.push({ name: lp.name, games: lp.gamesPlayed });
  }

  Date.now = _realDateNow;

  return {
    matches: finishedMatches.length,
    repeatedPartners: repeatedPartners,
    frequentOpponents: frequentOpponents,
    groupOverlaps: groupOverlaps,
    minGames: minGames,
    maxGames: maxGames,
    avgGames: avgGames,
    spread: maxGames - minGames,
    latePlayerGames: latePlayerGames
  };
}

// --- Run and validate ---
var failures = [];
var allResults = [];

console.log('Running ' + NUM_RUNS + ' shuffle simulations (' + NUM_PLAYERS + ' players, ' + NUM_COURTS + ' courts, ' + NUM_ROUNDS + ' rounds)...\n');

for (var run = 1; run <= NUM_RUNS; run++) {
  var result = runSimulation(run);
  allResults.push(result);

  var runFails = [];

  // Per-match thresholds (scale with total matches):
  //   partner repeat rate  ≤ 15% of total matches
  //   frequent opponent pairs (3+) ≤ 60% of total matches
  //   no pair with 6+ opponent repeats
  var maxPartnerRepeats = Math.floor(result.matches * 0.15);
  var maxFrequentOpp = Math.floor(result.matches * 0.60);
  var partnerCount = result.repeatedPartners.length;
  var frequentCount = result.frequentOpponents.length;
  var worstOpp = result.frequentOpponents.reduce(function(m, p) { return p[1] > m ? p[1] : m; }, 0);

  if (partnerCount > maxPartnerRepeats) {
    runFails.push('Partner pair repeats: ' + partnerCount + ' > ' + maxPartnerRepeats + ' limit — ' + result.repeatedPartners.map(function(p) { return p[0] + ' (' + p[1] + 'x)'; }).join(', '));
  }

  if (frequentCount > maxFrequentOpp) {
    runFails.push('Frequent opponents (3+): ' + frequentCount + ' > ' + maxFrequentOpp + ' limit — ' + result.frequentOpponents.map(function(p) { return p[0] + ' (' + p[1] + 'x)'; }).join(', '));
  }

  if (worstOpp >= 6) {
    runFails.push('Worst opponent pair: ' + worstOpp + 'x (max allowed: 5)');
  }

  if (result.groupOverlaps > 0) {
    runFails.push('Group regrouping: ' + result.groupOverlaps + ' exact same 4 players');
  }

  if (result.spread > 3) {
    runFails.push('Games spread too wide: ' + result.spread + ' (max-min: ' + result.maxGames + '-' + result.minGames + ')');
  }

  result.latePlayerGames.forEach(function(lp) {
    if (lp.games < result.avgGames - 2) {
      runFails.push('Late player ' + lp.name + ' underserved: ' + lp.games + ' games (avg ' + result.avgGames.toFixed(1) + ')');
    }
  });

  var status = runFails.length === 0 ? '✓' : '✗';
  var lateStr = result.latePlayerGames.map(function(lp) { return lp.name + '=' + lp.games; }).join(', ');
  console.log('  ' + status + ' Run ' + String(run).padStart(2) + ': ' + result.matches + ' matches, spread=' + result.spread + ' (' + result.minGames + '-' + result.maxGames + '), pairs=' + Object.keys(result.repeatedPartners.length > 0 ? result.repeatedPartners : {}).length + ' repeats, late: ' + lateStr);

  if (runFails.length > 0) {
    runFails.forEach(function(f) {
      console.log('         ' + f);
      failures.push('Run ' + run + ': ' + f);
    });
  }
}

console.log('');

if (failures.length === 0) {
  console.log('All ' + NUM_RUNS + ' simulations passed quality criteria ✓');
  console.log('');
  console.log('Criteria checked (per-match thresholds):');
  console.log('  • Partner pair repeats ≤ 15% of matches');
  console.log('  • Frequent opponent pairs (3+) ≤ 60% of matches');
  console.log('  • No pair with 6+ opponent repeats');
  console.log('  • No group regrouping (no exact same 4 players twice)');
  console.log('  • Games spread ≤ 3 (fair distribution)');
  console.log('  • Late players within avg - 2 games');
  process.exit(0);
} else {
  console.log('FAILED: ' + failures.length + ' issue(s) across ' + NUM_RUNS + ' runs');
  failures.forEach(function(f) { console.log('  • ' + f); });
  process.exit(1);
}
