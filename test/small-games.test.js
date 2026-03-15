var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('Small games (1v1 and 2v1)', function() {
  var p1, p2, p3, p4, p5;

  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1]);
    p1 = App.Players.add('Alice');
    p2 = App.Players.add('Bob');
    p3 = App.Players.add('Carol');
    p4 = App.Players.add('Dan');
    p5 = App.Players.add('Eve');
  });

  describe('startGame validation', function() {
    it('should accept 1v1 (2 players)', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      var matchId = App.Courts.startGame('c_1', [p1], [p2]);
      assert.notStrictEqual(matchId, null);
      assert.strictEqual(App.state.courts.c_1.occupied, true);
    });

    it('should accept 2v1 (3 players)', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Players.markPresent(p3);
      var matchId = App.Courts.startGame('c_1', [p1, p2], [p3]);
      assert.notStrictEqual(matchId, null);
    });

    it('should accept 1v2 (3 players, reversed)', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Players.markPresent(p3);
      var matchId = App.Courts.startGame('c_1', [p1], [p2, p3]);
      assert.notStrictEqual(matchId, null);
    });

    it('should accept 2v2 (4 players)', function() {
      [p1, p2, p3, p4].forEach(function(id) { App.Players.markPresent(id); });
      var matchId = App.Courts.startGame('c_1', [p1, p2], [p3, p4]);
      assert.notStrictEqual(matchId, null);
    });

    it('should reject empty team', function() {
      App.Players.markPresent(p1);
      var matchId = App.Courts.startGame('c_1', [], [p1]);
      assert.strictEqual(matchId, null);
    });

    it('should reject team of 3', function() {
      [p1, p2, p3, p4, p5].forEach(function(id) { App.Players.markPresent(id); });
      var matchId = App.Courts.startGame('c_1', [p1, p2, p3], [p4, p5]);
      assert.strictEqual(matchId, null);
    });

    it('should reject duplicate players', function() {
      App.Players.markPresent(p1);
      var matchId = App.Courts.startGame('c_1', [p1], [p1]);
      assert.strictEqual(matchId, null);
    });
  });

  describe('finishGame with 1v1', function() {
    it('should track wins/losses for 1v1', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Courts.startGame('c_1', [p1], [p2]);
      App.Courts.finishGame('c_1', '21-15');

      assert.strictEqual(App.state.players[p1].gamesPlayed, 1);
      assert.strictEqual(App.state.players[p2].gamesPlayed, 1);
      assert.strictEqual(App.state.players[p1].wins, 1);
      assert.strictEqual(App.state.players[p2].losses, 1);
    });

    it('should not create partner history for 1v1', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Courts.startGame('c_1', [p1], [p2]);
      App.Courts.finishGame('c_1', '21-15');

      assert.deepStrictEqual(App.state.players[p1].partnerHistory, {});
      assert.deepStrictEqual(App.state.players[p2].partnerHistory, {});
    });

    it('should track opponent history for 1v1', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Courts.startGame('c_1', [p1], [p2]);
      App.Courts.finishGame('c_1', '21-15');

      assert.strictEqual(App.state.players[p1].opponentHistory[p2], 1);
      assert.strictEqual(App.state.players[p2].opponentHistory[p1], 1);
    });

    it('should return 2 players to queue after 1v1', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Courts.startGame('c_1', [p1], [p2]);
      App.Courts.finishGame('c_1', '21-15');

      assert.strictEqual(App.state.waitingQueue.indexOf(p1) !== -1, true);
      assert.strictEqual(App.state.waitingQueue.indexOf(p2) !== -1, true);
    });
  });

  describe('finishGame with 2v1', function() {
    it('should track partner history only for 2-player team', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Players.markPresent(p3);
      App.Courts.startGame('c_1', [p1, p2], [p3]);
      App.Courts.finishGame('c_1', '21-15');

      // p1 and p2 were partners
      assert.strictEqual(App.state.players[p1].partnerHistory[p2], 1);
      assert.strictEqual(App.state.players[p2].partnerHistory[p1], 1);
      // p3 had no partner
      assert.deepStrictEqual(App.state.players[p3].partnerHistory, {});
    });

    it('should track all opponent history for 2v1', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Players.markPresent(p3);
      App.Courts.startGame('c_1', [p1, p2], [p3]);
      App.Courts.finishGame('c_1', '21-15');

      // p1 vs p3, p2 vs p3
      assert.strictEqual(App.state.players[p1].opponentHistory[p3], 1);
      assert.strictEqual(App.state.players[p2].opponentHistory[p3], 1);
      assert.strictEqual(App.state.players[p3].opponentHistory[p1], 1);
      assert.strictEqual(App.state.players[p3].opponentHistory[p2], 1);
    });

    it('should track wins/losses with score for 2v1', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Players.markPresent(p3);
      App.Courts.startGame('c_1', [p1, p2], [p3]);
      App.Courts.finishGame('c_1', '21-15');

      // Team A (p1, p2) won
      assert.strictEqual(App.state.players[p1].wins, 1);
      assert.strictEqual(App.state.players[p2].wins, 1);
      assert.strictEqual(App.state.players[p3].losses, 1);
      assert.strictEqual(App.state.players[p1].pointsScored, 21);
      assert.strictEqual(App.state.players[p3].pointsScored, 15);
    });

    it('should return 3 players to queue after 2v1', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Players.markPresent(p3);
      App.Courts.startGame('c_1', [p1, p2], [p3]);
      App.Courts.finishGame('c_1', '21-15');

      assert.strictEqual(App.state.waitingQueue.indexOf(p1) !== -1, true);
      assert.strictEqual(App.state.waitingQueue.indexOf(p2) !== -1, true);
      assert.strictEqual(App.state.waitingQueue.indexOf(p3) !== -1, true);
    });
  });

  describe('cancelGame', function() {
    it('should cancel 1v1 and return players to queue', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Courts.startGame('c_1', [p1], [p2]);
      App.Courts.cancelGame('c_1');

      assert.strictEqual(App.state.courts.c_1.occupied, false);
      assert.strictEqual(App.state.players[p1].gamesPlayed, 0);
      assert.strictEqual(App.state.waitingQueue.indexOf(p1) !== -1, true);
      assert.strictEqual(App.state.waitingQueue.indexOf(p2) !== -1, true);
    });

    it('should cancel 2v1 and return players to queue', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Players.markPresent(p3);
      App.Courts.startGame('c_1', [p1, p2], [p3]);
      App.Courts.cancelGame('c_1');

      assert.strictEqual(App.state.courts.c_1.occupied, false);
      assert.strictEqual(App.state.waitingQueue.indexOf(p1) !== -1, true);
      assert.strictEqual(App.state.waitingQueue.indexOf(p2) !== -1, true);
      assert.strictEqual(App.state.waitingQueue.indexOf(p3) !== -1, true);
    });
  });

  describe('suggest fallback', function() {
    it('should suggest 1v1 with 2 candidates', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      var result = App.Suggest.forCourt('c_1');
      assert.notStrictEqual(result.players, null);
      assert.strictEqual(result.players.length, 2);
      assert.strictEqual(result.teamA.length, 1);
      assert.strictEqual(result.teamB.length, 1);
    });

    it('should suggest 2v1 with 3 candidates', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Players.markPresent(p3);
      var result = App.Suggest.forCourt('c_1');
      assert.notStrictEqual(result.players, null);
      assert.strictEqual(result.players.length, 3);
      // One team has 2, other has 1
      var sizes = [result.teamA.length, result.teamB.length].sort();
      assert.deepStrictEqual(sizes, [1, 2]);
    });

    it('should suggest 2v2 with 4+ candidates', function() {
      [p1, p2, p3, p4].forEach(function(id) { App.Players.markPresent(id); });
      var result = App.Suggest.forCourt('c_1');
      assert.strictEqual(result.players.length, 4);
      assert.strictEqual(result.teamA.length, 2);
      assert.strictEqual(result.teamB.length, 2);
    });

    it('should return null with 1 candidate', function() {
      App.Players.markPresent(p1);
      var result = App.Suggest.forCourt('c_1');
      assert.strictEqual(result.players, null);
    });

    it('should return null with 0 candidates', function() {
      var result = App.Suggest.forCourt('c_1');
      assert.strictEqual(result.players, null);
    });
  });

  describe('splitTeams', function() {
    it('should produce 3 splits for 4 players', function() {
      [p1, p2, p3, p4].forEach(function(id) { App.Players.markPresent(id); });
      var players = [p1, p2, p3, p4].map(function(id) { return App.state.players[id]; });
      var result = App.Suggest.splitTeams(players);
      assert.strictEqual(result.allSplits.length, 3);
      assert.strictEqual(result.teamA.length, 2);
      assert.strictEqual(result.teamB.length, 2);
    });

    it('should produce 3 splits for 3 players (2v1)', function() {
      [p1, p2, p3].forEach(function(id) { App.Players.markPresent(id); });
      var players = [p1, p2, p3].map(function(id) { return App.state.players[id]; });
      var result = App.Suggest.splitTeams(players);
      assert.strictEqual(result.allSplits.length, 3);
      var sizes = [result.teamA.length, result.teamB.length].sort();
      assert.deepStrictEqual(sizes, [1, 2]);
    });

    it('should produce 1 split for 2 players (1v1)', function() {
      [p1, p2].forEach(function(id) { App.Players.markPresent(id); });
      var players = [p1, p2].map(function(id) { return App.state.players[id]; });
      var result = App.Suggest.splitTeams(players);
      assert.strictEqual(result.allSplits.length, 1);
      assert.strictEqual(result.teamA.length, 1);
      assert.strictEqual(result.teamB.length, 1);
    });
  });

  describe('undoLast', function() {
    it('should undo 1v1 match correctly', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Courts.startGame('c_1', [p1], [p2]);
      App.Courts.finishGame('c_1', '21-15');

      assert.strictEqual(App.state.players[p1].gamesPlayed, 1);
      App.Matches.undoLast();
      assert.strictEqual(App.state.players[p1].gamesPlayed, 0);
      assert.deepStrictEqual(App.state.players[p1].partnerHistory, {});
    });

    it('should undo declared winner wins/losses', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Courts.startGame('c_1', [p1], [p2]);
      App.Courts.finishGame('c_1', null, 'teamA');

      assert.strictEqual(App.state.players[p1].wins, 1);
      assert.strictEqual(App.state.players[p2].losses, 1);
      App.Matches.undoLast();
      assert.strictEqual(App.state.players[p1].wins, 0);
      assert.strictEqual(App.state.players[p2].losses, 0);
    });

    it('should undo score-based wins/losses', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Courts.startGame('c_1', [p1], [p2]);
      App.Courts.finishGame('c_1', '21-15');

      assert.strictEqual(App.state.players[p1].wins, 1);
      assert.strictEqual(App.state.players[p2].losses, 1);
      assert.strictEqual(App.state.players[p1].pointsScored, 21);
      App.Matches.undoLast();
      assert.strictEqual(App.state.players[p1].wins, 0);
      assert.strictEqual(App.state.players[p2].losses, 0);
      assert.strictEqual(App.state.players[p1].pointsScored, 0);
    });

    it('should undo 2v1 partner history only for 2-player team', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Players.markPresent(p3);
      App.Courts.startGame('c_1', [p1, p2], [p3]);
      App.Courts.finishGame('c_1', '21-15');

      assert.strictEqual(App.state.players[p1].partnerHistory[p2], 1);
      App.Matches.undoLast();
      assert.strictEqual(App.state.players[p1].partnerHistory[p2] || 0, 0);
      assert.deepStrictEqual(App.state.players[p3].partnerHistory, {});
    });
  });

  describe('player stats computation', function() {
    it('should handle 1v1 in _computePlayerStats (no partner)', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Courts.startGame('c_1', [p1], [p2]);
      App.Courts.finishGame('c_1', '21-15');

      var stats = App.UI._computePlayerStats(p1);
      assert.notStrictEqual(stats, null);
      // No partner stats for 1v1
      assert.strictEqual(stats.favoritePartner, null);
    });

    it('should handle 2v1 in _computePlayerStats', function() {
      App.Players.markPresent(p1);
      App.Players.markPresent(p2);
      App.Players.markPresent(p3);
      App.Courts.startGame('c_1', [p1, p2], [p3]);
      App.Courts.finishGame('c_1', '21-15');

      var stats1 = App.UI._computePlayerStats(p1);
      assert.strictEqual(stats1.favoritePartner, p2);

      var stats3 = App.UI._computePlayerStats(p3);
      assert.strictEqual(stats3.favoritePartner, null);
    });
  });
});
