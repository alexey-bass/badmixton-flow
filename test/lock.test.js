var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.Lock', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1, 2]);
  });

  describe('isLocked', function() {
    it('should return false by default', function() {
      assert.strictEqual(App.Lock.isLocked(), false);
    });

    it('should return true when settings.locked is true', function() {
      App.state.settings.locked = true;
      assert.strictEqual(App.Lock.isLocked(), true);
    });
  });

  describe('lock', function() {
    it('should set settings.locked to true', function() {
      App.Lock.lock();
      assert.strictEqual(App.state.settings.locked, true);
    });

    it('should persist to localStorage', function() {
      App.Lock.lock();
      var saved = App.Storage.load(App.state.date);
      assert.strictEqual(saved.settings.locked, true);
    });

    it('should clear queue when clearQueueOnLock is enabled', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      App.Players.markPresent(id1);
      App.Players.markPresent(id2);
      assert.strictEqual(App.state.waitingQueue.length, 2);

      App.state.settings.clearQueueOnLock = true;
      App.Lock.lock();

      assert.strictEqual(App.state.waitingQueue.length, 0);
      // Players should still exist
      assert.ok(App.state.players[id1]);
      assert.ok(App.state.players[id2]);
    });

    it('should not clear queue when clearQueueOnLock is disabled', function() {
      var id1 = App.Players.add('Alice');
      App.Players.markPresent(id1);

      App.state.settings.clearQueueOnLock = false;
      App.Lock.lock();

      assert.strictEqual(App.state.waitingQueue.length, 1);
    });
  });

  describe('unlock', function() {
    it('should set settings.locked to false after being locked', function() {
      App.state.settings.locked = true;
      App.Lock.unlock();
      assert.strictEqual(App.state.settings.locked, false);
    });

    it('should persist to localStorage', function() {
      App.state.settings.locked = true;
      App.Lock.unlock();
      var saved = App.Storage.load(App.state.date);
      assert.strictEqual(saved.settings.locked, false);
    });
  });

  describe('checkAutoLock', function() {
    it('should do nothing when autoLockTime is null', function() {
      App.state.settings.autoLockTime = null;
      App.Lock.checkAutoLock();
      assert.strictEqual(App.state.settings.locked, false);
    });

    it('should do nothing when already locked', function() {
      App.state.settings.locked = true;
      App.state.settings.autoLockTime = '00:00';
      // Should not throw or change state
      App.Lock.checkAutoLock();
      assert.strictEqual(App.state.settings.locked, true);
    });

    it('should lock when current time >= autoLockTime (time in past)', function() {
      App.state.settings.autoLockTime = '00:00'; // midnight — always in the past
      App.Lock.checkAutoLock();
      assert.strictEqual(App.state.settings.locked, true);
    });

    it('should clear queue on auto-lock when clearQueueOnLock is enabled', function() {
      var id1 = App.Players.add('Alice');
      App.Players.markPresent(id1);
      App.state.settings.clearQueueOnLock = true;
      App.state.settings.autoLockTime = '00:00';

      App.Lock.checkAutoLock();

      assert.strictEqual(App.state.settings.locked, true);
      assert.strictEqual(App.state.waitingQueue.length, 0);
      assert.ok(App.state.players[id1]);
    });

    it('should not lock when current time < autoLockTime (time in future)', function() {
      App.state.settings.autoLockTime = '23:59';
      var now = new Date();
      // Only test if it's not actually 23:59
      if (now.getHours() < 23 || now.getMinutes() < 59) {
        App.Lock.checkAutoLock();
        assert.strictEqual(App.state.settings.locked, false);
      }
    });
  });

  describe('state migration', function() {
    it('should add locked: false when missing', function() {
      var state = { players: {}, settings: {} };
      var result = App.Storage._ensureState(state);
      assert.strictEqual(result.settings.locked, false);
    });

    it('should add autoLockTime: null when missing', function() {
      var state = { players: {}, settings: {} };
      var result = App.Storage._ensureState(state);
      assert.strictEqual(result.settings.autoLockTime, null);
    });

    it('should add clearQueueOnLock: false when missing', function() {
      var state = { players: {}, settings: {} };
      var result = App.Storage._ensureState(state);
      assert.strictEqual(result.settings.clearQueueOnLock, false);
    });

    it('should preserve existing locked: true', function() {
      var state = { players: {}, settings: { locked: true, autoLockTime: '20:00' } };
      var result = App.Storage._ensureState(state);
      assert.strictEqual(result.settings.locked, true);
      assert.strictEqual(result.settings.autoLockTime, '20:00');
    });
  });

  describe('session create defaults', function() {
    it('should have locked: false in new session', function() {
      assert.strictEqual(App.state.settings.locked, false);
    });

    it('should have autoLockTime: null in new session', function() {
      assert.strictEqual(App.state.settings.autoLockTime, null);
    });

    it('should have clearQueueOnLock: false in new session', function() {
      assert.strictEqual(App.state.settings.clearQueueOnLock, false);
    });
  });

  describe('i18n keys', function() {
    it('should have lock translations in both languages', function() {
      var keys = ['sessionLock', 'lockSession', 'unlockSession', 'autoLockLabel',
                  'autoLockAt', 'autoLockDisabled', 'sessionLocked', 'sessionUnlocked', 'sessionAutoLocked',
                  'clearQueueOnLockLabel'];
      keys.forEach(function(key) {
        assert.notStrictEqual(App.i18n.translations.pl[key], undefined, 'Missing PL: ' + key);
        assert.notStrictEqual(App.i18n.translations.en[key], undefined, 'Missing EN: ' + key);
      });
    });
  });
});
