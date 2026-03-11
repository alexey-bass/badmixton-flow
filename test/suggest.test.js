var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.Suggest', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1, 2]);
  });

  describe('_diversifySelection', function() {
    it('should mix players from different recent matches', function() {
      // Setup: 8 players, all present and in queue
      var ids = [];
      for (var i = 0; i < 8; i++) {
        var id = App.Players.add('Player' + (i + 1));
        App.Players.markPresent(id);
        ids.push(id);
      }

      // Game 1: first 4 play on court 1
      var courts = Object.keys(App.state.courts);
      App.Courts.startGame(courts[0], [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame(courts[0]);

      // Game 2: last 4 play on court 2
      App.Courts.startGame(courts[1], [ids[4], ids[5]], [ids[6], ids[7]]);
      App.Courts.finishGame(courts[1]);

      // Now queue is [ids[0..3], ids[4..7]] — all have 1 game
      // Without diversification, top 4 would be ids[0..3] (same group again)
      var result = App.Suggest.forCourt(courts[0]);

      assert.ok(result.players, 'should suggest players');
      assert.strictEqual(result.players.length, 4);

      // Count how many from game 1 group are in the suggestion
      var game1Players = [ids[0], ids[1], ids[2], ids[3]];
      var fromGame1 = result.players.filter(function(id) {
        return game1Players.indexOf(id) !== -1;
      });

      // Should have at most 2 from the same recent match (diversified)
      assert.ok(fromGame1.length <= 2,
        'Expected at most 2 from game 1 group, got ' + fromGame1.length);
    });

    it('should not swap when fewer than 3 overlap with a recent match', function() {
      // Setup: 6 players
      var ids = [];
      for (var i = 0; i < 6; i++) {
        var id = App.Players.add('Player' + (i + 1));
        App.Players.markPresent(id);
        ids.push(id);
      }

      // Game 1: first 4 play
      var courts = Object.keys(App.state.courts);
      App.Courts.startGame(courts[0], [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame(courts[0]);

      // Queue after: [ids[4], ids[5], ids[0], ids[1], ids[2], ids[3]]
      // Top 4 = ids[4], ids[5], ids[0], ids[1] — only 2 from game 1
      var result = App.Suggest.forCourt(courts[0]);

      assert.ok(result.players, 'should suggest players');
      // ids[4] and ids[5] should be in the suggestion (first in queue, 0 games)
      assert.ok(result.players.indexOf(ids[4]) !== -1, 'ids[4] should be suggested');
      assert.ok(result.players.indexOf(ids[5]) !== -1, 'ids[5] should be suggested');
    });

    it('should handle when no replacement candidates available', function() {
      // Only 4 players — no one to swap with
      var ids = [];
      for (var i = 0; i < 4; i++) {
        var id = App.Players.add('Player' + (i + 1));
        App.Players.markPresent(id);
        ids.push(id);
      }

      var courts = Object.keys(App.state.courts);
      App.Courts.startGame(courts[0], [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame(courts[0]);

      // All 4 back in queue, no alternatives
      var result = App.Suggest.forCourt(courts[0]);

      assert.ok(result.players, 'should still suggest players');
      assert.strictEqual(result.players.length, 4);
    });
  });
});
