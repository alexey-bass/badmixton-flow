var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

function setupWithMatches() {
  App.Session.create();
  App.Session.initCourts([1, 2]);

  var ids = ['Alice', 'Bob', 'Carol', 'Dave'].map(function(name) {
    var id = App.Players.add(name);
    App.Players.markPresent(id);
    return id;
  });

  // Game 1 on court 1
  App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
  App.Courts.finishGame('c_1', '21-15');

  // Game 2 on court 2 with new players
  var ids2 = ['Eve', 'Frank', 'Grace', 'Hank'].map(function(name) {
    var id = App.Players.add(name);
    App.Players.markPresent(id);
    return id;
  });

  App.Courts.startGame('c_2', [ids2[0], ids2[1]], [ids2[2], ids2[3]]);
  App.Courts.finishGame('c_2', '15-21');

  return { ids: ids, ids2: ids2 };
}

describe('App.Matches', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  describe('getFinished', function() {
    it('should return finished matches sorted by endTime descending', function() {
      setupWithMatches();
      var finished = App.Matches.getFinished();
      assert.strictEqual(finished.length, 2);
      assert.ok(finished[0].endTime >= finished[1].endTime, 'should be sorted newest first');
      finished.forEach(function(m) {
        assert.strictEqual(m.status, 'finished');
      });
    });

    it('should return empty array when no matches', function() {
      App.Session.create();
      assert.deepStrictEqual(App.Matches.getFinished(), []);
    });

    it('should exclude playing matches', function() {
      App.Session.create();
      App.Session.initCourts([1]);
      var ids = ['Alice', 'Bob', 'Carol', 'Dave'].map(function(name) {
        var id = App.Players.add(name);
        App.Players.markPresent(id);
        return id;
      });
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);

      assert.strictEqual(App.Matches.getFinished().length, 0);
    });
  });

  describe('getFiltered', function() {
    it('should return all finished when no filters', function() {
      setupWithMatches();
      assert.strictEqual(App.Matches.getFiltered().length, 2);
    });

    it('should return all when filters are "all"', function() {
      setupWithMatches();
      assert.strictEqual(App.Matches.getFiltered('all', 'all').length, 2);
    });

    it('should filter by court', function() {
      setupWithMatches();
      var filtered = App.Matches.getFiltered('c_1');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].courtId, 'c_1');
    });

    it('should filter by player', function() {
      var setup = setupWithMatches();
      var filtered = App.Matches.getFiltered(null, setup.ids[0]);
      assert.strictEqual(filtered.length, 1);
      assert.ok(
        filtered[0].teamA.indexOf(setup.ids[0]) !== -1 ||
        filtered[0].teamB.indexOf(setup.ids[0]) !== -1
      );
    });

    it('should filter by both court and player', function() {
      var setup = setupWithMatches();
      assert.strictEqual(App.Matches.getFiltered('c_1', setup.ids[0]).length, 1);
      assert.strictEqual(App.Matches.getFiltered('c_2', setup.ids[0]).length, 0);
    });

    it('should return empty for unknown player', function() {
      setupWithMatches();
      assert.strictEqual(App.Matches.getFiltered(null, 'nonexistent').length, 0);
    });

    it('should return empty for unknown court', function() {
      setupWithMatches();
      assert.strictEqual(App.Matches.getFiltered('c_99').length, 0);
    });
  });
});
