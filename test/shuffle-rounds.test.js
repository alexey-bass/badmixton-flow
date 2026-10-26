var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

// Issue #82: "Add N rounds" must produce N whole rounds for any player/court
// combination, including when fewer than courtCount games fit in a round
// (players < 4 * courts). ALGO.md documents the round-based invariant: games
// are grouped into rounds of gamesPerRound consecutive entries, and within a
// round every player appears at most once.

function createShuffleSession(playerCount, courtCount) {
  App.Session.create('Test', 'shuffle');
  var numbers = [];
  for (var c = 1; c <= courtCount; c++) numbers.push(c);
  App.Session.initCourts(numbers);
  for (var i = 0; i < playerCount; i++) {
    var id = App.Players.add('P' + (i + 1));
    App.Players.markPresent(id);
  }
}

// Drive the real schedule-tab click handler ("Add 1 round" / "Add 5 rounds")
// through App.UI._bindScheduleActions, without a DOM. Generation from the UI
// is asynchronous (#96), so wait for it to finish.
App.UI.showModal = function(html) { document.getElementById('modalContent').innerHTML = html; };
async function clickAddRounds(rounds) {
  var handlers = [];
  var container = { addEventListener: function(type, fn) { handlers.push(fn); } };
  App.UI._bindScheduleActions(container);
  assert.strictEqual(handlers.length, 1, 'schedule container should get one click handler');
  var btn = { dataset: { action: 'schedule-generate', rounds: String(rounds) } };
  handlers[0]({ target: { closest: function() { return btn; } } });
  while (App.Shuffle.generating) await new Promise(function(r) { setTimeout(r, 0); });
}

function gamesPerRound(playerCount, courtCount) {
  return App.Shuffle._computeRoundFormat(playerCount, courtCount).length;
}

// Every round (gamesPerRound consecutive entries) must be complete and must
// not contain the same player twice.
function assertWholeRounds(expectedRounds, gpr) {
  var schedule = App.state.schedule;
  assert.strictEqual(schedule.length, expectedRounds * gpr,
    'expected ' + expectedRounds + ' rounds x ' + gpr + ' games');
  for (var r = 0; r < expectedRounds; r++) {
    var seen = {};
    schedule.slice(r * gpr, (r + 1) * gpr).forEach(function(e) {
      e.teamA.concat(e.teamB).forEach(function(pid) {
        assert.ok(!seen[pid], 'round ' + (r + 1) + ': player ' + App.state.players[pid].name + ' appears twice');
        seen[pid] = true;
      });
    });
  }
}

describe('Shuffle: Add N rounds yields whole rounds (issue #82)', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  it('13 players / 4 courts: Add 5 rounds gives 5 rounds of 3 games', async function() {
    createShuffleSession(13, 4);
    var gpr = gamesPerRound(13, 4);
    assert.strictEqual(gpr, 3, '13 players fit 3 x 2v2 per round, 1 bench');

    await clickAddRounds(5);

    assertWholeRounds(5, gpr);
  });

  it('13 players / 4 courts: second Add 5 rounds continues on a round boundary', async function() {
    createShuffleSession(13, 4);
    var gpr = gamesPerRound(13, 4);

    await clickAddRounds(5);
    await clickAddRounds(5);

    assertWholeRounds(10, gpr);
  });

  it('13 players / 4 courts: Add 1 round gives exactly one round', async function() {
    createShuffleSession(13, 4);
    var gpr = gamesPerRound(13, 4);

    await clickAddRounds(1);

    assertWholeRounds(1, gpr);
  });

  it('9 players / 4 courts: Add 5 rounds gives 5 rounds of 2 games', async function() {
    createShuffleSession(9, 4);
    var gpr = gamesPerRound(9, 4);
    assert.strictEqual(gpr, 2);

    await clickAddRounds(5);

    assertWholeRounds(5, gpr);
  });

  it('17 players / 4 courts (full courts): Add 5 rounds gives 20 games', async function() {
    createShuffleSession(17, 4);
    var gpr = gamesPerRound(17, 4);
    assert.strictEqual(gpr, 4);

    await clickAddRounds(5);

    assertWholeRounds(5, gpr);
  });
});

// Issue #77: the board, bench counts and print must group games by the
// round stored on each entry (set at generation time), not by slicing the
// schedule into courtCount-sized chunks. Each entry also stores its round's
// bench so late arrivals are not counted as benched for earlier rounds.

function roundsOf() {
  return App.state.schedule.map(function(e) { return e.round; });
}

function capturePrintHtml() {
  var doc = null;
  var origOpen = window.open;
  window.open = function() {
    doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
    return { document: doc, focus: function() {}, print: function() {} };
  };
  App.UI.printSchedule();
  window.open = origOpen;
  return doc ? doc._html : '';
}

describe('Shuffle: round and bench stored on entries (issue #77)', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  it('9 players / 4 courts: each entry carries its round and a 1-player bench', async function() {
    createShuffleSession(9, 4);
    await clickAddRounds(5);

    assert.deepStrictEqual(roundsOf(), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
    App.state.schedule.forEach(function(e) {
      assert.strictEqual(e.bench.length, 1, 'one player benched per round');
      var inRound = {};
      App.state.schedule.filter(function(o) { return o.round === e.round; }).forEach(function(o) {
        o.teamA.concat(o.teamB).forEach(function(pid) { inRound[pid] = true; });
      });
      assert.ok(!inRound[e.bench[0]], 'benched player must not play in that round');
    });
  });

  it('second batch continues the round numbering', async function() {
    createShuffleSession(13, 4);
    await clickAddRounds(1);
    await clickAddRounds(1);
    assert.deepStrictEqual(roundsOf(), [0, 0, 0, 1, 1, 1]);
  });

  it('9 players / 4 courts: getBenchCounts counts one bench per finished round', async function() {
    createShuffleSession(9, 4);
    await clickAddRounds(5);
    App.state.schedule.forEach(function(e) { e.status = 'finished'; });

    var counts = App.Shuffle.getBenchCounts();
    var total = Object.keys(counts).reduce(function(sum, pid) { return sum + counts[pid]; }, 0);
    assert.strictEqual(total, 5, 'five rounds, one bench slot each');
  });

  it('late arrival is not counted as benched for rounds generated before they arrived', async function() {
    createShuffleSession(9, 4);
    await clickAddRounds(2);
    App.state.schedule.forEach(function(e) { e.status = 'finished'; });
    var lateId = App.Players.add('Late');
    App.Players.markPresent(lateId);

    var counts = App.Shuffle.getBenchCounts();
    assert.strictEqual(counts[lateId], undefined, 'late player has no bench rounds');
    var total = Object.keys(counts).reduce(function(sum, pid) { return sum + counts[pid]; }, 0);
    assert.strictEqual(total, 2);
  });

  it('legacy entries without round/bench are reconstructed on load', async function() {
    createShuffleSession(13, 4);
    await clickAddRounds(2);
    App.state.schedule.forEach(function(e) { delete e.round; delete e.bench; });

    App.state = App.Storage._ensureState(App.state);

    assert.deepStrictEqual(roundsOf(), [0, 0, 0, 1, 1, 1]);
    App.state.schedule.forEach(function(e) {
      assert.strictEqual(e.bench.length, 1);
    });
  });

  it('legacy entries on full courts are reconstructed as courtCount-sized rounds', async function() {
    createShuffleSession(17, 4);
    await clickAddRounds(2);
    App.state.schedule.forEach(function(e) { delete e.round; delete e.bench; });

    App.state = App.Storage._ensureState(App.state);

    assert.deepStrictEqual(roundsOf(), [0, 0, 0, 0, 1, 1, 1, 1]);
  });

  it('13 players / 4 courts: print fills courts by position in round and shows the bench column', async function() {
    createShuffleSession(13, 4);
    await clickAddRounds(2);

    var html = capturePrintHtml();
    var courts = [];
    var cellRe = /<td class="court-cell">([^<]*)<\/td>/g;
    var m;
    while ((m = cellRe.exec(html)) !== null) courts.push(m[1]);
    assert.deepStrictEqual(courts, ['K1', 'K2', 'K3', 'K1', 'K2', 'K3'], 'court 4 is never used by a 3-game round');
    var roundCells = html.match(/rowspan="3"/g) || [];
    assert.strictEqual(roundCells.length, 4, 'round cell + bench cell for each of 2 rounds, spanning 3 rows');
  });

  it('13 players / 4 courts: board shows exactly one benched player per round', async function() {
    createShuffleSession(13, 4);
    await clickAddRounds(2);
    App.Shuffle.autoAssignAll();

    App.UI.renderBoard();
    var html = document.getElementById('boardCourts').innerHTML;
    var benchDivs = html.match(/<div class="board-round-bench">[^<]*<\/div>/g) || [];
    assert.strictEqual(benchDivs.length, 2, 'current round bench + one upcoming round bench');
    benchDivs.forEach(function(div) {
      assert.strictEqual((div.match(/#\d+/g) || []).length, 1, 'one player per bench line: ' + div);
    });
  });

  it('swapping a bench player into a pending game updates the round bench', async function() {
    createShuffleSession(9, 4);
    await clickAddRounds(2);
    // Round 0 is auto-assigned (ready); round 1 is still pending and editable
    var entry = App.state.schedule[2];
    assert.strictEqual(entry.status, 'pending');
    var benchPid = entry.bench[0];
    var outPid = entry.teamA[0];

    assert.strictEqual(App.Shuffle.swapPlayer(entry.id, outPid, benchPid), true);

    App.state.schedule.filter(function(e) { return e.round === 1; }).forEach(function(e) {
      assert.deepStrictEqual(e.bench, [outPid], 'swapped-out player is now the only benched player');
    });
    assert.strictEqual(App.state.schedule[0].bench.length, 1, 'other rounds untouched');
  });
});
