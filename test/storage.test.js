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
        'resultsLimit', 'showResults', 'syncEnabled'
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

    it('should always return sessionId regardless of sync state', function() {
      App.Session.create();
      App.state.settings.syncEnabled = true;
      assert.strictEqual(App.Storage._keySuffix(), App.state.sessionId);
    });
  });

  describe('sync-aware save and load', function() {
    it('should save under sessionId key when sync is enabled', function() {
      App.Session.create();
      App.state.settings.syncEnabled = true;
      App.Storage.save();

      var loaded = App.Storage.load(App.state.sessionId);
      assert.ok(loaded);
      assert.strictEqual(loaded.settings.syncEnabled, true);
    });

    it('should always save under sessionId key', function() {
      App.Session.create();
      var sessionId = App.state.sessionId;
      App.state.settings.syncEnabled = true;
      App.Storage.save();

      // Should be found by sessionId
      assert.ok(App.Storage.load(sessionId));
    });

    it('should store last key suffix as sessionId', function() {
      App.Session.create();
      App.state.settings.syncEnabled = true;
      App.Storage.save();

      assert.strictEqual(localStorage.getItem(App.Storage.LAST_KEY), App.state.sessionId);
    });

    it('should track session in index', function() {
      App.Session.create();
      App.state.settings.syncEnabled = true;
      App.Storage.save();

      var index = App.Storage.getIndex();
      assert.ok(index.includes(App.state.sessionId));
    });
  });

  describe('migration', function() {
    it('should migrate syncSessionId from settings to sessionId', function() {
      var state = App.Storage._ensureState({
        players: {},
        settings: { syncEnabled: true, syncSessionId: 'old-sync-id' }
      });
      assert.strictEqual(state.sessionId, 'old-sync-id');
      assert.strictEqual(state.settings.syncSessionId, undefined);
    });

    it('should not overwrite existing sessionId during migration', function() {
      var state = App.Storage._ensureState({
        players: {},
        sessionId: 'existing-id',
        settings: { syncEnabled: true, syncSessionId: 'old-sync-id' }
      });
      assert.strictEqual(state.sessionId, 'existing-id');
      assert.strictEqual(state.settings.syncSessionId, undefined);
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

  describe('getSettings', function() {
    it('should return empty object when no settings', function() {
      assert.deepStrictEqual(App.Storage.getSettings(), {});
    });

    it('should return saved settings', function() {
      localStorage.setItem(App.Storage.SETTINGS_KEY, JSON.stringify({ lang: 'en' }));
      assert.deepStrictEqual(App.Storage.getSettings(), { lang: 'en' });
    });

    it('should return empty object on corrupt JSON', function() {
      localStorage.setItem(App.Storage.SETTINGS_KEY, '{bad json');
      assert.deepStrictEqual(App.Storage.getSettings(), {});
    });
  });

  describe('saveSettings', function() {
    it('should persist settings to localStorage', function() {
      App.Storage.saveSettings({ lang: 'pl', zoom: 1.5 });
      var raw = JSON.parse(localStorage.getItem(App.Storage.SETTINGS_KEY));
      assert.strictEqual(raw.lang, 'pl');
      assert.strictEqual(raw.zoom, 1.5);
    });

    it('should overwrite previous settings', function() {
      App.Storage.saveSettings({ lang: 'pl' });
      App.Storage.saveSettings({ lang: 'en' });
      assert.deepStrictEqual(App.Storage.getSettings(), { lang: 'en' });
    });
  });

  describe('exportJSON', function() {
    it('should create download with correct filename', function() {
      App.Session.create();
      var origShowToast = App.UI.showToast;
      var toastMsg = null;
      App.UI.showToast = function(msg) { toastMsg = msg; };

      var createdEl = null;
      var origCreateElement = document.createElement;
      document.createElement = function(tag) {
        createdEl = origCreateElement(tag);
        return createdEl;
      };

      App.Storage.exportJSON();

      assert.ok(createdEl, 'should create an anchor element');
      assert.strictEqual(createdEl.href, 'blob:mock-url');
      assert.ok(createdEl.download.endsWith('.json'), 'filename should end with .json');
      assert.ok(createdEl.download.startsWith(App.Storage.SESSION_PREFIX));
      assert.strictEqual(toastMsg, App.t('exportDone'));

      App.UI.showToast = origShowToast;
      document.createElement = origCreateElement;
    });
  });

  describe('importJSON', function() {
    it('should import valid state', function() {
      App.Session.create();
      var origShowToast = App.UI.showToast;
      var origRenderAll = App.UI.renderAll;
      var toastMsg = null;
      App.UI.showToast = function(msg) { toastMsg = msg; };
      App.UI.renderAll = function() {};

      var validState = {
        version: 1, sessionId: 'bf-test', date: '2026-01-01',
        players: { p1: { name: 'Test' } }, courts: { c1: {} },
        matches: {}, waitingQueue: [], schedule: [], name: '',
        settings: { syncEnabled: false, locked: false, autoLockTime: '', clearQueueOnLock: false, showResults: true, resultsLimit: 0 },
        nextPlayerNumber: 1, isAdmin: true, mode: 'queue'
      };
      var file = { _content: JSON.stringify(validState) };
      App.Storage.importJSON(file);

      assert.strictEqual(App.state.version, 1);
      assert.strictEqual(App.state.players.p1.name, 'Test');
      assert.strictEqual(toastMsg, App.t('importDone'));

      App.UI.showToast = origShowToast;
      App.UI.renderAll = origRenderAll;
    });

    it('should reject JSON without required fields', function() {
      App.Session.create();
      var origShowToast = App.UI.showToast;
      var toastMsg = null;
      App.UI.showToast = function(msg) { toastMsg = msg; };

      var file = { _content: JSON.stringify({ foo: 'bar' }) };
      App.Storage.importJSON(file);

      assert.strictEqual(toastMsg, App.t('invalidFile'));

      App.UI.showToast = origShowToast;
    });

    it('should handle invalid JSON', function() {
      App.Session.create();
      var origShowToast = App.UI.showToast;
      var toastMsg = null;
      App.UI.showToast = function(msg) { toastMsg = msg; };

      var file = { _content: '{not valid json' };
      App.Storage.importJSON(file);

      assert.strictEqual(toastMsg, App.t('fileReadError'));

      App.UI.showToast = origShowToast;
    });
  });
});
