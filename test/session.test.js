var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.Session', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  describe('create', function() {
    it('should create a new session with all required fields', function() {
      App.Session.create();

      assert.ok(App.state);
      assert.strictEqual(App.state.version, 1);
      assert.ok(App.state.date);
      assert.strictEqual(App.state.name, '');
      assert.deepStrictEqual(App.state.players, {});
      assert.deepStrictEqual(App.state.waitingQueue, []);
      assert.deepStrictEqual(App.state.courts, {});
      assert.deepStrictEqual(App.state.matches, {});
      assert.strictEqual(App.state.nextPlayerNumber, 1);
      assert.strictEqual(App.state.isAdmin, true);
      assert.strictEqual(App.state.settings.syncEnabled, false);
      assert.strictEqual(App.state.settings.syncSessionId, null);
    });

    it('should have exact top-level keys', function() {
      App.Session.create();
      var keys = Object.keys(App.state).sort();
      assert.deepStrictEqual(keys, [
        'courts', 'date', 'isAdmin', 'lastModified', 'matches',
        'mode', 'name', 'nextPlayerNumber', 'players', 'schedule',
        'sessionId', 'settings', 'version', 'waitingQueue'
      ]);
    });

    it('should have exact settings keys', function() {
      App.Session.create();
      var keys = Object.keys(App.state.settings).sort();
      assert.deepStrictEqual(keys, [
        'autoLockTime', 'clearQueueOnLock', 'locked',
        'resultsLimit', 'showResults', 'syncEnabled', 'syncSessionId'
      ]);
    });

    it('should set today\'s date', function() {
      App.Session.create();
      var today = new Date().toISOString().split('T')[0];
      assert.strictEqual(App.state.date, today);
    });
  });

  describe('initCourts', function() {
    it('should create courts with given numbers', function() {
      App.Session.create();
      App.Session.initCourts([1, 2, 3]);

      var courts = Object.values(App.state.courts);
      assert.strictEqual(courts.length, 3);
      assert.strictEqual(courts[0].displayNumber, 1);
      assert.strictEqual(courts[1].displayNumber, 2);
      assert.strictEqual(courts[2].displayNumber, 3);
    });

    it('should create courts with correct default state', function() {
      App.Session.create();
      App.Session.initCourts([5]);

      var court = App.state.courts['c_5'];
      assert.ok(court);
      assert.strictEqual(court.active, true);
      assert.strictEqual(court.occupied, false);
      assert.strictEqual(court.currentMatch, null);
    });

    it('should preserve existing occupied courts', function() {
      App.Session.create();
      App.Session.initCourts([1, 2]);
      App.state.courts['c_1'].occupied = true;
      App.state.courts['c_1'].currentMatch = 'match1';

      App.Session.initCourts([1, 2, 3]);
      assert.strictEqual(App.state.courts['c_1'].occupied, true);
      assert.strictEqual(App.state.courts['c_1'].currentMatch, 'match1');
      assert.strictEqual(Object.keys(App.state.courts).length, 3);
    });
  });

  describe('resetToday', function() {
    it('should reset player stats but keep players', function() {
      App.Session.create();
      App.Session.initCourts([1]);
      var id = App.Players.add('Test');
      App.Players.markPresent(id);
      App.state.players[id].gamesPlayed = 5;
      App.state.players[id].wins = 3;

      App.Session.resetToday();

      assert.ok(App.state.players[id]);
      assert.strictEqual(App.state.players[id].name, 'Test');
      assert.strictEqual(App.state.players[id].present, false);
      assert.strictEqual(App.state.players[id].gamesPlayed, 0);
    });

    it('should clear queue and matches', function() {
      App.Session.create();
      App.Session.initCourts([1]);
      App.state.waitingQueue = ['a', 'b'];
      App.state.matches = { m1: {} };

      App.Session.resetToday();

      assert.deepStrictEqual(App.state.waitingQueue, []);
      assert.deepStrictEqual(App.state.matches, {});
    });
  });
});
