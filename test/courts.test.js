var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

function setupGameSession() {
  App.Session.create();
  App.Session.initCourts([1, 2]);

  // Add 4 present players
  var ids = ['Alice', 'Bob', 'Carol', 'Dave'].map(function(name) {
    var id = App.Players.add(name);
    App.Players.markPresent(id);
    return id;
  });

  return ids;
}

describe('App.Courts', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  describe('startGame', function() {
    it('should start a game on a court', function() {
      var ids = setupGameSession();
      var teamA = [ids[0], ids[1]];
      var teamB = [ids[2], ids[3]];

      App.Courts.startGame('c_1', teamA, teamB);

      var court = App.state.courts['c_1'];
      assert.strictEqual(court.occupied, true);
      assert.ok(court.currentMatch);
      assert.ok(court.gameStartTime);

      var match = App.state.matches[court.currentMatch];
      assert.deepStrictEqual(match.teamA, teamA);
      assert.deepStrictEqual(match.teamB, teamB);
      assert.strictEqual(match.status, 'playing');
    });

    it('should remove players from queue', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);

      ids.forEach(function(id) {
        assert.strictEqual(App.Queue.getPosition(id), -1);
      });
    });

    it('should accumulate wait time when starting game', function() {
      var ids = setupGameSession();
      // Set queue entry times to 60 seconds ago
      ids.forEach(function(id) {
        App.state.players[id].queueEntryTime = Date.now() - 60000;
      });
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      ids.forEach(function(id) {
        var p = App.state.players[id];
        assert.ok(p.totalWaitTime >= 59000, 'totalWaitTime should be ~60s, got ' + p.totalWaitTime);
        assert.strictEqual(p.waitCount, 1);
      });
    });

    it('should accumulate wait time across multiple games', function() {
      var ids = setupGameSession();
      // First game: waited 60s
      ids.forEach(function(id) {
        App.state.players[id].queueEntryTime = Date.now() - 60000;
      });
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');
      // Second game: waited another 30s
      ids.forEach(function(id) {
        App.state.players[id].queueEntryTime = Date.now() - 30000;
      });
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      ids.forEach(function(id) {
        var p = App.state.players[id];
        assert.strictEqual(p.waitCount, 2);
        assert.ok(p.totalWaitTime >= 85000, 'totalWaitTime should be ~90s, got ' + p.totalWaitTime);
      });
    });

    it('should not start game on occupied court', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);

      // Add more players
      var id5 = App.Players.add('Eve');
      var id6 = App.Players.add('Frank');
      var id7 = App.Players.add('Grace');
      var id8 = App.Players.add('Hank');
      [id5, id6, id7, id8].forEach(function(id) { App.Players.markPresent(id); });

      var matchesBefore = Object.keys(App.state.matches).length;
      App.Courts.startGame('c_1', [id5, id6], [id7, id8]);
      assert.strictEqual(Object.keys(App.state.matches).length, matchesBefore);
    });
  });

  describe('finishGame', function() {
    it('should finish a game and free the court', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');

      var court = App.state.courts['c_1'];
      assert.strictEqual(court.occupied, false);
      assert.strictEqual(court.currentMatch, null);
    });

    it('should increment gamesPlayed for all players', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');

      ids.forEach(function(id) {
        assert.strictEqual(App.state.players[id].gamesPlayed, 1);
      });
    });

    it('should return players to queue', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');

      ids.forEach(function(id) {
        assert.ok(App.state.waitingQueue.includes(id));
      });
    });

    it('should track score when provided', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1', '21-15');

      // Find the match
      var match = Object.values(App.state.matches).find(function(m) {
        return m.status === 'finished';
      });
      assert.strictEqual(match.score, '21-15');
    });

    it('should track wins/losses with score', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1', '21-15');

      // Team A wins (21 > 15)
      assert.strictEqual(App.state.players[ids[0]].wins, 1);
      assert.strictEqual(App.state.players[ids[1]].wins, 1);
      assert.strictEqual(App.state.players[ids[2]].losses, 1);
      assert.strictEqual(App.state.players[ids[3]].losses, 1);
    });

    it('should track points scored/conceded', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1', '21-15');

      // Team A scored 21, conceded 15
      assert.strictEqual(App.state.players[ids[0]].pointsScored, 21);
      assert.strictEqual(App.state.players[ids[0]].pointsConceded, 15);
      // Team B scored 15, conceded 21
      assert.strictEqual(App.state.players[ids[2]].pointsScored, 15);
      assert.strictEqual(App.state.players[ids[2]].pointsConceded, 21);
    });

    it('should not track wins/losses without score', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');

      ids.forEach(function(id) {
        assert.strictEqual(App.state.players[id].wins, 0);
        assert.strictEqual(App.state.players[id].losses, 0);
      });
    });

    it('should track wins/losses with declared winner teamA', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1', null, 'teamA');

      assert.strictEqual(App.state.players[ids[0]].wins, 1);
      assert.strictEqual(App.state.players[ids[1]].wins, 1);
      assert.strictEqual(App.state.players[ids[2]].losses, 1);
      assert.strictEqual(App.state.players[ids[3]].losses, 1);
      // No points tracked without score
      assert.strictEqual(App.state.players[ids[0]].pointsScored, 0);
    });

    it('should track wins/losses with declared winner teamB', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1', null, 'teamB');

      assert.strictEqual(App.state.players[ids[0]].losses, 1);
      assert.strictEqual(App.state.players[ids[1]].losses, 1);
      assert.strictEqual(App.state.players[ids[2]].wins, 1);
      assert.strictEqual(App.state.players[ids[3]].wins, 1);
    });

    it('should not track wins/losses on draw', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1', null, 'draw');

      ids.forEach(function(id) {
        assert.strictEqual(App.state.players[id].wins, 0);
        assert.strictEqual(App.state.players[id].losses, 0);
      });
    });

    it('should store winner field on match', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      var matchId = App.state.courts['c_1'].currentMatch;
      App.Courts.finishGame('c_1', null, 'teamA');

      assert.strictEqual(App.state.matches[matchId].winner, 'teamA');
      assert.strictEqual(App.state.matches[matchId].score, null);
    });

    it('should update partner history', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');

      assert.strictEqual(App.state.players[ids[0]].partnerHistory[ids[1]], 1);
      assert.strictEqual(App.state.players[ids[1]].partnerHistory[ids[0]], 1);
    });

    it('should update opponent history', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');

      assert.strictEqual(App.state.players[ids[0]].opponentHistory[ids[2]], 1);
      assert.strictEqual(App.state.players[ids[0]].opponentHistory[ids[3]], 1);
    });
  });

  describe('cancelGame', function() {
    it('should cancel game and return players to front of queue', function() {
      var ids = setupGameSession();
      // Add an extra player to queue first
      var extraId = App.Players.add('Eve');
      App.Players.markPresent(extraId);

      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.cancelGame('c_1');

      var court = App.state.courts['c_1'];
      assert.strictEqual(court.occupied, false);

      // Cancelled players should be at front of queue
      assert.ok(App.state.waitingQueue.indexOf(ids[0]) < App.state.waitingQueue.indexOf(extraId));
    });

    it('should not increment gamesPlayed', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.cancelGame('c_1');

      ids.forEach(function(id) {
        assert.strictEqual(App.state.players[id].gamesPlayed, 0);
      });
    });
  });

  describe('getAvailable', function() {
    it('should return free courts', function() {
      setupGameSession();
      var available = App.Courts.getAvailable();
      assert.strictEqual(available.length, 2);
    });

    it('should exclude occupied courts', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);

      var available = App.Courts.getAvailable();
      assert.strictEqual(available.length, 1);
      assert.strictEqual(available[0].id, 'c_2');
    });
  });

  describe('getGameDuration', function() {
    it('should return 0 for empty court', function() {
      setupGameSession();
      assert.strictEqual(App.Courts.getGameDuration('c_1'), 0);
    });

    it('should return elapsed time for active game', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      // Set start time to 60s ago
      App.state.courts['c_1'].gameStartTime = Date.now() - 60000;

      var duration = App.Courts.getGameDuration('c_1');
      assert.ok(duration >= 59000, 'duration should be ~60s, got ' + duration);
      assert.ok(duration <= 62000, 'duration should be ~60s, got ' + duration);
    });

    it('should return 0 for non-existent court', function() {
      setupGameSession();
      assert.strictEqual(App.Courts.getGameDuration('c_99'), 0);
    });
  });

  describe('getGameNumber', function() {
    it('should return 0 when no games played on court', function() {
      setupGameSession();
      assert.strictEqual(App.Courts.getGameNumber('c_1'), 0);
    });

    it('should count finished games on specific court', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');

      assert.strictEqual(App.Courts.getGameNumber('c_1'), 1);
      assert.strictEqual(App.Courts.getGameNumber('c_2'), 0);
    });

    it('should not count playing games', function() {
      var ids = setupGameSession();
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);

      assert.strictEqual(App.Courts.getGameNumber('c_1'), 0);
    });

    it('should count multiple games', function() {
      var ids = setupGameSession();
      // Game 1
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');
      // Game 2
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');

      assert.strictEqual(App.Courts.getGameNumber('c_1'), 2);
    });
  });
});
