var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

function createSession(mode, names, courts) {
  App.Session.create('Test', mode || 'queue');
  App.Session.initCourts(courts || [1, 2]);
  return names.map(function(n) {
    var id = App.Players.add(n);
    App.Players.markPresent(id);
    return id;
  });
}

function P(id) { return App.state.players[id]; }

describe('Draw with a score records points (#72)', function() {
  beforeEach(function() { localStorage.clear(); });

  it('20-20 gives every player 20 scored and 20 conceded, no wins or losses', function() {
    var ids = createSession('queue', ['A', 'B', 'C', 'D']);
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    App.Courts.finishGame('c_1', '20-20', 'draw');

    ids.forEach(function(id) {
      assert.strictEqual(P(id).pointsScored, 20);
      assert.strictEqual(P(id).pointsConceded, 20);
      assert.strictEqual(P(id).wins, 0);
      assert.strictEqual(P(id).losses, 0);
    });
    var m = Object.values(App.state.matches)[0];
    assert.strictEqual(m.winner, 'draw');
  });

  it('undo removes the draw points again', function() {
    var ids = createSession('queue', ['A', 'B', 'C', 'D']);
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    App.Courts.finishGame('c_1', '20-20', 'draw');
    App.Matches.undoLast();
    ids.forEach(function(id) {
      assert.strictEqual(P(id).pointsScored, 0);
      assert.strictEqual(P(id).pointsConceded, 0);
    });
  });

  it('a decided score still gives each side its own points and the win/loss', function() {
    var ids = createSession('queue', ['A', 'B', 'C', 'D']);
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    App.Courts.finishGame('c_1', '21-15');
    assert.strictEqual(P(ids[0]).pointsScored, 21);
    assert.strictEqual(P(ids[0]).pointsConceded, 15);
    assert.strictEqual(P(ids[0]).wins, 1);
    assert.strictEqual(P(ids[2]).pointsScored, 15);
    assert.strictEqual(P(ids[2]).pointsConceded, 21);
    assert.strictEqual(P(ids[2]).losses, 1);
    App.Matches.undoLast();
    assert.strictEqual(P(ids[0]).pointsScored, 0);
    assert.strictEqual(P(ids[0]).wins, 0);
    assert.strictEqual(P(ids[2]).losses, 0);
  });
});

describe('Reset day clears results and wait stats (#71)', function() {
  beforeEach(function() { localStorage.clear(); });

  it('zeroes wins, losses, points and wait stats', function() {
    var ids = createSession('queue', ['A']);
    var p = P(ids[0]);
    p.wins = 3; p.losses = 2; p.pointsScored = 63; p.pointsConceded = 40; p.totalWaitTime = 90000; p.waitCount = 4;
    App.Session.resetToday();
    assert.strictEqual(p.wins, 0);
    assert.strictEqual(p.losses, 0);
    assert.strictEqual(p.pointsScored, 0);
    assert.strictEqual(p.pointsConceded, 0);
    assert.strictEqual(p.totalWaitTime, 0);
    assert.strictEqual(p.waitCount, 0);
    assert.strictEqual(p.name, 'A', 'player kept');
  });
});

describe('Wait time accounting (#73)', function() {
  beforeEach(function() { localStorage.clear(); });

  it('cancel gives the counted wait back and a restart does not double count', function() {
    var ids = createSession('queue', ['A', 'B', 'C', 'D']);
    var tenMin = 10 * 60 * 1000;
    var entry = Date.now() - tenMin;
    ids.forEach(function(id) { P(id).queueEntryTime = entry; });

    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    var a = P(ids[0]);
    assert.ok(a.totalWaitTime >= tenMin && a.totalWaitTime < tenMin + 2000);
    assert.strictEqual(a.waitCount, 1);
    assert.strictEqual(a.queueEntryTime, 0, 'entry time cleared once counted');

    App.Courts.cancelGame('c_1');
    assert.strictEqual(a.totalWaitTime, 0, 'wait given back');
    assert.strictEqual(a.waitCount, 0);
    assert.ok(Math.abs(a.queueEntryTime - entry) < 2000, 'original wait resumes');

    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    assert.ok(a.totalWaitTime >= tenMin && a.totalWaitTime < tenMin + 2000, 'counted once, not twice');
    assert.strictEqual(a.waitCount, 1);
  });

  it('shuffle mode: the next wait starts when the previous game ends, not at arrival', function() {
    var ids = createSession('shuffle', ['A', 'B', 'C', 'D'], [1]);
    var hour = 60 * 60 * 1000;
    ids.forEach(function(id) { P(id).queueEntryTime = Date.now() - hour; });

    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    App.Courts.finishGame('c_1', '21-10');
    var a = P(ids[0]);
    assert.ok(Math.abs(a.queueEntryTime - Date.now()) < 2000, 'wait restarts at game end');

    App.Courts.startGame('c_1', [ids[0], ids[2]], [ids[1], ids[3]]);
    assert.strictEqual(a.waitCount, 2);
    assert.ok(a.totalWaitTime < hour + 5000, 'second game added only the gap since the first ended, not another hour');
  });
});

describe('Undo last match (#70)', function() {
  beforeEach(function() { localStorage.clear(); });

  it('queue mode: does not re-queue players who are on another court or absent', function() {
    var ids = createSession('queue', ['A', 'B', 'C', 'D', 'E']);
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    App.Courts.finishGame('c_1', '21-15');
    App.Courts.startGame('c_2', [ids[0], ids[1]], [ids[2], ids[4]]);
    App.Players.markAbsent(ids[3]);

    App.Matches.undoLast();

    var q = App.state.waitingQueue;
    [ids[0], ids[1], ids[2]].forEach(function(id) { assert.strictEqual(q.indexOf(id), -1, 'on-court player not queued'); });
    assert.strictEqual(q.indexOf(ids[3]), -1, 'absent player not queued');
    assert.strictEqual(Object.keys(App.state.matches).filter(function(k) { return App.state.matches[k].status === 'finished'; }).length, 0);
  });

  it('queue mode: returns available players to the front of the queue', function() {
    var ids = createSession('queue', ['A', 'B', 'C', 'D', 'E', 'F']);
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    App.Courts.finishGame('c_1', '21-15');
    App.Matches.undoLast();
    assert.deepStrictEqual(App.state.waitingQueue.slice(0, 4), [ids[0], ids[1], ids[2], ids[3]]);
    assert.strictEqual(App.state.waitingQueue.length, 6);
  });

  it('reverts lastGameEndTime to the previous finished game', function() {
    var ids = createSession('queue', ['A', 'B', 'C', 'D']);
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    App.Courts.finishGame('c_1', '21-15');
    var t1 = P(ids[0]).lastGameEndTime;
    Object.values(App.state.matches)[0].endTime = t1 - 1000; // make it clearly earlier
    t1 = t1 - 1000;
    App.Courts.startGame('c_1', [ids[0], ids[2]], [ids[1], ids[3]]);
    App.Courts.finishGame('c_1', '21-15');
    assert.ok(P(ids[0]).lastGameEndTime > t1);
    App.Matches.undoLast();
    assert.strictEqual(P(ids[0]).lastGameEndTime, t1);
  });

  it('shuffle mode: a court holds exactly one ready game after undo', function() {
    var ids = createSession('shuffle', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'], [1, 2, 3]);
    App.Shuffle.generateRounds(2);
    App.Shuffle.autoAssignAll();
    App.state.schedule.filter(function(e) { return e.status === 'ready'; }).forEach(function(e) {
      App.Courts.startGame(e.courtId, e.teamA, e.teamB);
    });
    Object.values(App.state.courts).filter(function(c) { return c.occupied; }).forEach(function(c) {
      App.Courts.finishGame(c.id, '21-15');
    });
    App.Shuffle.autoAssignAll();

    App.Matches.undoLast();

    var ready = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
    var perCourt = {};
    ready.forEach(function(e) { perCourt[e.courtId] = (perCourt[e.courtId] || 0) + 1; });
    Object.keys(perCourt).forEach(function(c) {
      assert.strictEqual(perCourt[c], 1, 'one ready game on ' + c);
    });
    var undone = App.state.schedule.filter(function(e) { return e.round === 0 && e.status === 'ready'; });
    assert.strictEqual(undone.length, 1, 'the undone round-1 game is ready again on its court');
    assert.strictEqual(App.state.schedule.filter(function(e) { return e.status === 'finished'; }).length, 2);
  });
});

describe('Import runs the state migration (#74)', function() {
  beforeEach(function() { localStorage.clear(); });

  it('an old export without wishedPartners/schedule can be used right away', function() {
    createSession('queue', ['A']);
    var legacy = {
      version: 1,
      sessionId: 'bf-legacy1',
      date: '2026-01-10',
      mode: 'queue',
      players: { p1: { id: 'p1', number: 1, name: 'Old', present: true, gamesPlayed: 0 } },
      waitingQueue: ['p1'],
      courts: { c_1: { id: 'c_1', displayNumber: 1, active: true, occupied: false, currentMatch: null, gameStartTime: null } },
      matches: {},
      settings: { syncEnabled: false },
      nextPlayerNumber: 2
    };
    var toast = null;
    var origToast = App.UI.showToast;
    App.UI.showToast = function(m) { toast = m; };
    App.Storage.importJSON({ _content: JSON.stringify(legacy) });
    App.UI.showToast = origToast;

    assert.strictEqual(toast, App.t('importDone'));
    assert.strictEqual(App.state.sessionId, 'bf-legacy1');
    assert.deepStrictEqual(App.state.players.p1.wishedPartners, []);
    assert.deepStrictEqual(App.state.schedule, []);
    assert.strictEqual(App.state.settings.locked, false);
    assert.doesNotThrow(function() { App.Players.remove('p1'); });
    assert.strictEqual(App.state.players.p1, undefined);
  });
});
