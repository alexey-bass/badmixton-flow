var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

function createShuffle(names, courts) {
  App.Session.create('Test', 'shuffle');
  App.Session.initCourts(courts || [1, 2, 3, 4]);
  return names.map(function(n) {
    var id = App.Players.add(n);
    App.Players.markPresent(id);
    return id;
  });
}

function entry(id, round, teamA, teamB, status, courtId) {
  return { id: id, round: round, bench: [], teamA: teamA, teamB: teamB, status: status || 'pending', courtId: courtId || null, matchId: null };
}

function byStatus(status) { return App.state.schedule.filter(function(e) { return e.status === status; }); }

describe('Round-by-round auto-assign (#68)', function() {
  beforeEach(function() { localStorage.clear(); });

  it('picks a playable game of the current round but never one from a later round', function() {
    var ids = createShuffle(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);
    var A = ids[0], B = ids[1], C = ids[2], D = ids[3], E = ids[4], F = ids[5], G = ids[6], H = ids[7], I = ids[8], J = ids[9], K = ids[10], L = ids[11];
    App.state.schedule = [
      entry('r0a', 0, [A, B], [C, D], 'ready', 'c_1'),
      entry('r0b', 0, [E, F], [G, H], 'ready', 'c_2'),
      entry('r1a', 1, [A, B], [E, F]),      // blocked: all four busy
      entry('r1b', 1, [I, J], [K, L]),      // playable
      entry('r2a', 2, [I, J], [K, L])       // playable, but a later round
    ];
    App.Courts.startGame('c_1', [A, B], [C, D]);
    App.Courts.startGame('c_2', [E, F], [G, H]);

    var first = App.Shuffle.assignNextToCourt('c_3');
    assert.strictEqual(first.id, 'r1b', 'the free game of round 1 is taken even though r1a comes first');

    var second = App.Shuffle.assignNextToCourt('c_4');
    assert.strictEqual(second, null, 'court 4 waits: r1a is blocked and r2a belongs to a later round');
    assert.strictEqual(App.state.schedule[4].status, 'pending');

    // Once round-1 players are free, the blocked game goes first
    App.Courts.finishGame('c_1', '21-15');
    App.Courts.finishGame('c_2', '21-15');
    assert.strictEqual(App.state.schedule[2].status, 'ready', 'r1a assigned as soon as its players are free');
  });

  it('13 players / 3 courts: after sequential finishes every court gets a round-2 game (deterministic)', function() {
    for (var run = 0; run < 10; run++) {
      localStorage.clear();
      createShuffle(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'], [1, 2, 3]);
      App.Shuffle.generateRounds(4);
      App.Shuffle.autoAssignAll();
      byStatus('ready').forEach(function(e) { App.Courts.startGame(e.courtId, e.teamA, e.teamB); });
      Object.values(App.state.courts).filter(function(c) { return c.occupied; }).forEach(function(c) {
        App.Courts.finishGame(c.id, '21-15');
      });
      App.Shuffle.autoAssignAll();
      var ready = byStatus('ready');
      assert.strictEqual(ready.length, 3, 'run ' + run + ': all 3 courts have a ready game');
      ready.forEach(function(e) { assert.strictEqual(e.round, 1, 'run ' + run + ': ready games are all from round 2'); });
    }
  });

  it('manual start of a pending game whose players are busy leaves it pending', function() {
    var ids = createShuffle(['A', 'B', 'C', 'D', 'E', 'F']);
    App.state.schedule = [
      entry('g0', 0, [ids[0], ids[1]], [ids[2], ids[3]], 'ready', 'c_1'),
      entry('g1', 1, [ids[0], ids[1]], [ids[4], ids[5]])
    ];
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);

    var matchId = App.Shuffle.startPendingOnCourt('g1', 'c_2');
    assert.strictEqual(matchId, null);
    assert.strictEqual(App.state.schedule[1].status, 'pending');
    assert.strictEqual(App.state.schedule[1].courtId, null);
    assert.strictEqual(App.state.courts.c_2.occupied, false);
  });

  it('manual start of a playable pending game starts it on that court', function() {
    var ids = createShuffle(['A', 'B', 'C', 'D']);
    App.state.schedule = [entry('g0', 0, [ids[0], ids[1]], [ids[2], ids[3]])];
    var matchId = App.Shuffle.startPendingOnCourt('g0', 'c_2');
    assert.ok(matchId);
    assert.strictEqual(App.state.schedule[0].status, 'playing');
    assert.strictEqual(App.state.schedule[0].courtId, 'c_2');
  });
});

describe('Deleting players in shuffle mode (#69)', function() {
  beforeEach(function() { localStorage.clear(); });

  it('remove takes the player out of pending games (downgrade 2v2 → 2v1)', function() {
    var ids = createShuffle(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], [1, 2]);
    App.Shuffle.generateRounds(1);
    var victim = App.state.schedule[0].teamA[0];

    assert.strictEqual(App.Players.remove(victim), true);

    App.state.schedule.forEach(function(e) {
      assert.strictEqual(e.teamA.concat(e.teamB).indexOf(victim), -1, 'no ghost id left in ' + e.id);
    });
    var touched = App.state.schedule[0];
    assert.strictEqual(touched.teamA.length + touched.teamB.length, 3, 'game downgraded to 2v1');
    assert.strictEqual(App.Shuffle.autoAssignAll() >= 1, true);
    var ready = byStatus('ready')[0];
    assert.ok(App.Courts.startGame(ready.courtId, ready.teamA, ready.teamB), 'downgraded game starts fine');
  });

  it('removeAll leaves no pending or ready games behind', function() {
    createShuffle(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], [1, 2]);
    App.Shuffle.generateRounds(2);
    App.Players.removeAll();
    assert.strictEqual(Object.keys(App.state.players).length, 0);
    assert.strictEqual(byStatus('pending').length + byStatus('ready').length, 0);
  });

  it('startGame refuses an unknown player id', function() {
    var ids = createShuffle(['A', 'B', 'C']);
    var toasts = [];
    var orig = App.UI.showToast;
    App.UI.showToast = function(m) { toasts.push(m); };
    var result = App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], 'p_ghost']);
    App.UI.showToast = orig;
    assert.strictEqual(result, null);
    assert.deepStrictEqual(toasts, [App.t('playerUnknown')]);
    assert.strictEqual(App.state.courts.c_1.occupied, false);
  });
});

describe('Reshuffle (#76)', function() {
  beforeEach(function() { localStorage.clear(); });

  function teams() {
    return JSON.stringify(App.state.schedule.map(function(e) { return [e.teamA, e.teamB]; }));
  }

  it('regenerates as many rounds as it removed and produces a different draw', function() {
    createShuffle(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']);
    App.Shuffle.generateRounds(3);
    assert.strictEqual(App.state.schedule.length, 9);
    var before = teams();

    App.Shuffle.reshuffle();
    assert.strictEqual(App.state.schedule.length, 9, 'three rounds again, not one');
    var after1 = teams();
    assert.notStrictEqual(after1, before, 'reshuffle gives a new schedule');

    App.Shuffle.reshuffle();
    assert.notStrictEqual(teams(), after1, 'reshuffling again gives yet another one');
    assert.deepStrictEqual(App.state.schedule.map(function(e) { return e.round; }), [0, 0, 0, 1, 1, 1, 2, 2, 2]);
  });

  it('keeps finished games and only regenerates the open ones', function() {
    createShuffle(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'], [1, 2, 3]);
    App.Shuffle.generateRounds(3);
    App.Shuffle.autoAssignAll();
    byStatus('ready').forEach(function(e) { App.Courts.startGame(e.courtId, e.teamA, e.teamB); });
    Object.values(App.state.courts).filter(function(c) { return c.occupied; }).forEach(function(c) { App.Courts.finishGame(c.id, '21-15'); });
    App.Shuffle.reshuffle();
    assert.strictEqual(byStatus('finished').length, 3);
    assert.strictEqual(App.state.schedule.length, 9, '3 finished + 2 regenerated rounds of 3');
  });
});

describe('Wish pull-in keeps the wisher (#81)', function() {
  beforeEach(function() { localStorage.clear(); });

  function createQueue(n) {
    App.Session.create('Test', 'queue');
    App.Session.initCourts([1]);
    var ids = [];
    for (var i = 0; i < n; i++) { var id = App.Players.add('P' + (i + 1)); App.Players.markPresent(id); ids.push(id); }
    return ids;
  }

  it('a 4th-ranked wisher is not replaced by their own wished partner', function() {
    var ids = createQueue(6);
    var wisher = ids[3], wished = ids[4];
    App.state.players[wisher].wishedPartners = [wished];

    var result = App.Suggest.forCourt('c_1');
    var picked = result.teamA.concat(result.teamB);
    assert.ok(picked.indexOf(wisher) !== -1, 'wisher stays in the game');
    assert.ok(picked.indexOf(wished) !== -1, 'wished partner pulled in');
    assert.strictEqual(picked.length, 4);
  });

  it('only one wish is honoured per suggestion', function() {
    var ids = createQueue(8);
    App.state.players[ids[0]].wishedPartners = [ids[4]];
    App.state.players[ids[1]].wishedPartners = [ids[5]];

    var result = App.Suggest.forCourt('c_1');
    var picked = result.teamA.concat(result.teamB);
    assert.ok(picked.indexOf(ids[0]) !== -1 && picked.indexOf(ids[4]) !== -1, 'first wish honoured');
    assert.strictEqual(picked.indexOf(ids[5]), -1, 'second wish does not overwrite the first partner');
  });
});
