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
// through App.UI._bindScheduleActions, without a DOM.
function clickAddRounds(rounds) {
  var handlers = [];
  var container = { addEventListener: function(type, fn) { handlers.push(fn); } };
  App.UI._bindScheduleActions(container);
  assert.strictEqual(handlers.length, 1, 'schedule container should get one click handler');
  var btn = { dataset: { action: 'schedule-generate', rounds: String(rounds) } };
  handlers[0]({ target: { closest: function() { return btn; } } });
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

  it('13 players / 4 courts: Add 5 rounds gives 5 rounds of 3 games', function() {
    createShuffleSession(13, 4);
    var gpr = gamesPerRound(13, 4);
    assert.strictEqual(gpr, 3, '13 players fit 3 x 2v2 per round, 1 bench');

    clickAddRounds(5);

    assertWholeRounds(5, gpr);
  });

  it('13 players / 4 courts: second Add 5 rounds continues on a round boundary', function() {
    createShuffleSession(13, 4);
    var gpr = gamesPerRound(13, 4);

    clickAddRounds(5);
    clickAddRounds(5);

    assertWholeRounds(10, gpr);
  });

  it('13 players / 4 courts: Add 1 round gives exactly one round', function() {
    createShuffleSession(13, 4);
    var gpr = gamesPerRound(13, 4);

    clickAddRounds(1);

    assertWholeRounds(1, gpr);
  });

  it('9 players / 4 courts: Add 5 rounds gives 5 rounds of 2 games', function() {
    createShuffleSession(9, 4);
    var gpr = gamesPerRound(9, 4);
    assert.strictEqual(gpr, 2);

    clickAddRounds(5);

    assertWholeRounds(5, gpr);
  });

  it('17 players / 4 courts (full courts): Add 5 rounds gives 20 games', function() {
    createShuffleSession(17, 4);
    var gpr = gamesPerRound(17, 4);
    assert.strictEqual(gpr, 4);

    clickAddRounds(5);

    assertWholeRounds(5, gpr);
  });
});
