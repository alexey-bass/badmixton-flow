var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.Storage', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  describe('save and load', function() {
    it('should save and load session state', function() {
      App.Session.create();
      App.Storage.save();

      var loaded = App.Storage.load(App.state.sessionId);
      assert.ok(loaded);
      assert.strictEqual(loaded.date, App.state.date);
      assert.deepStrictEqual(loaded.players, {});
    });

    it('should return null for non-existent key', function() {
      var loaded = App.Storage.load('nonexistent-key');
      assert.strictEqual(loaded, null);
    });

    it('should preserve full session structure through save/load round-trip', function() {
      App.Session.create('Test Session');
      App.Session.initCourts([1, 2]);
      var id = App.Players.add('Alice');
      App.Players.markPresent(id);
      App.Storage.save();

      var loaded = App.Storage.load(App.state.sessionId);
      assert.deepStrictEqual(Object.keys(loaded).sort(), Object.keys(App.state).sort());
      assert.deepStrictEqual(Object.keys(loaded.settings).sort(), Object.keys(App.state.settings).sort());
      assert.strictEqual(loaded.name, 'Test Session');
      assert.deepStrictEqual(Object.keys(loaded.players[id]).sort(), Object.keys(App.state.players[id]).sort());
    });
  });

  describe('_ensureState', function() {
    it('should return null for invalid input', function() {
      assert.strictEqual(App.Storage._ensureState(null), null);
      assert.strictEqual(App.Storage._ensureState('string'), null);
    });

    it('should fill missing fields', function() {
      var state = App.Storage._ensureState({ players: { p1: { name: 'Test' } } });
      assert.ok(Array.isArray(state.waitingQueue));
      assert.ok(typeof state.courts === 'object');
      assert.ok(typeof state.matches === 'object');
      assert.ok(typeof state.settings === 'object');
      assert.strictEqual(state.nextPlayerNumber, 1);
      assert.strictEqual(state.isAdmin, true);
    });

    it('should migrate player fields', function() {
      var state = App.Storage._ensureState({
        players: { p1: { name: 'Test' } },
        courts: {}
      });
      var p = state.players.p1;
      assert.deepStrictEqual(p.partnerHistory, {});
      assert.deepStrictEqual(p.opponentHistory, {});
      assert.strictEqual(p.wins, 0);
      assert.strictEqual(p.losses, 0);
      assert.strictEqual(p.pointsScored, 0);
      assert.strictEqual(p.pointsConceded, 0);
      assert.strictEqual(p.totalWaitTime, 0);
      assert.strictEqual(p.waitCount, 0);
    });

    it('should not overwrite existing fields', function() {
      var state = App.Storage._ensureState({
        players: {},
        waitingQueue: ['a', 'b'],
        courts: { c1: {} },
        matches: {},
        settings: { courtNumbers: [1, 2] },
        nextPlayerNumber: 5,
        date: '2026-01-01'
      });
      assert.deepStrictEqual(state.waitingQueue, ['a', 'b']);
      assert.strictEqual(state.nextPlayerNumber, 5);
      assert.strictEqual(state.date, '2026-01-01');
    });

    it('should produce all required top-level keys from minimal input', function() {
      var state = App.Storage._ensureState({ players: {} });
      var keys = Object.keys(state).sort();
      assert.deepStrictEqual(keys, [
        'courts', 'date', 'isAdmin', 'matches', 'mode', 'name',
        'nextPlayerNumber', 'players', 'schedule', 'sessionId',
        'settings', 'waitingQueue'
      ]);
    });

    it('should produce all required settings keys from missing settings', function() {
      var state = App.Storage._ensureState({ players: {} });
      var keys = Object.keys(state.settings).sort();
      assert.deepStrictEqual(keys, [
        'autoLockTime', 'clearQueueOnLock', 'locked',
        'resultsLimit', 'showResults', 'syncEnabled', 'syncSessionId'
      ]);
    });

    it('should add all migration fields to minimal player', function() {
      var state = App.Storage._ensureState({
        players: { p1: { id: 'p1', name: 'Test', number: 1, present: true, gamesPlayed: 0, lastGameEndTime: 0, queueEntryTime: 0 } }
      });
      var keys = Object.keys(state.players.p1).sort();
      assert.deepStrictEqual(keys, [
        'gamesPlayed', 'id', 'lastGameEndTime', 'losses', 'name', 'number',
        'opponentHistory', 'partnerHistory', 'pointsConceded', 'pointsScored',
        'present', 'queueEntryTime', 'totalWaitTime', 'waitCount',
        'wins', 'wishedPartners', 'wishesFulfilled'
      ]);
    });

    it('should produce exact player keys via Players.add', function() {
      App.Session.create();
      var id = App.Players.add('Test');
      var keys = Object.keys(App.state.players[id]).sort();
      assert.deepStrictEqual(keys, [
        'gamesPlayed', 'id', 'lastGameEndTime', 'losses', 'name', 'number',
        'opponentHistory', 'partnerHistory', 'pointsConceded', 'pointsScored',
        'present', 'queueEntryTime', 'totalWaitTime', 'waitCount',
        'wins', 'wishedPartners', 'wishesFulfilled'
      ]);
    });

  });

  describe('_keySuffix', function() {
    it('should return sessionId by default', function() {
      App.Session.create();
      assert.strictEqual(App.Storage._keySuffix(), App.state.sessionId);
      assert.ok(App.state.sessionId.startsWith('bf-'));
    });

    it('should return syncSessionId when sync is enabled', function() {
      App.Session.create();
      App.state.settings.syncEnabled = true;
      App.state.settings.syncSessionId = 'badminton-2026-03-11-a3x9k';
      assert.strictEqual(App.Storage._keySuffix(), 'badminton-2026-03-11-a3x9k');
    });
  });

  describe('sync-aware save and load', function() {
    it('should save under sync key when sync is enabled', function() {
      App.Session.create();
      App.state.settings.syncEnabled = true;
      App.state.settings.syncSessionId = 'test-session-abc';
      App.Storage.save();

      var loaded = App.Storage.load('test-session-abc');
      assert.ok(loaded);
      assert.strictEqual(loaded.settings.syncSessionId, 'test-session-abc');
    });

    it('should save sync session under sync key, not sessionId key', function() {
      App.Session.create();
      localStorage.clear(); // clear the sessionId-keyed save from create()
      App.state.settings.syncEnabled = true;
      App.state.settings.syncSessionId = 'test-session-xyz';
      App.Storage.save();

      // Should be found by sync ID
      assert.ok(App.Storage.load('test-session-xyz'));
      // Should not be found by sessionId
      assert.strictEqual(App.Storage.load(App.state.sessionId), null);
    });

    it('should store last key suffix', function() {
      App.Session.create();
      App.state.settings.syncEnabled = true;
      App.state.settings.syncSessionId = 'my-session';
      App.Storage.save();

      assert.strictEqual(localStorage.getItem(App.Storage.LAST_KEY), 'my-session');
    });

    it('should track sync session in index', function() {
      App.Session.create();
      App.state.settings.syncEnabled = true;
      App.state.settings.syncSessionId = 'indexed-session';
      App.Storage.save();

      var index = App.Storage.getIndex();
      assert.ok(index.includes('indexed-session'));
    });
  });

  describe('getIndex', function() {
    it('should return empty array when no index exists', function() {
      assert.deepStrictEqual(App.Storage.getIndex(), []);
    });

    it('should track saved sessions in index', function() {
      App.Session.create();
      App.Storage.save();
      var index = App.Storage.getIndex();
      assert.ok(index.includes(App.state.sessionId));
    });
  });
});
