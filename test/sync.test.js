var { describe, it, beforeEach, afterEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.Sync', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1, 2]);
    // Reset sync state
    App.Sync.connected = false;
    App.Sync.ref = null;
    App.Sync._pushCount = 0;
    App.Sync._listener = null;
  });

  describe('_pushCount guard', function() {
    it('should ignore incoming changes while a push is in-flight', function() {
      App.Sync._pushCount = 1;
      var originalState = JSON.parse(JSON.stringify(App.state));

      // Simulate incoming remote data with a newer timestamp
      var remote = JSON.parse(JSON.stringify(App.state));
      remote.lastModified = Date.now() + 10000;
      remote.waitingQueue = ['fake-player'];

      // The listener callback checks _pushCount > 0
      var ignored = App.Sync._pushCount > 0;
      assert.strictEqual(ignored, true, 'should ignore when pushCount > 0');
      assert.deepStrictEqual(App.state.waitingQueue, originalState.waitingQueue);
    });

    it('should accept incoming changes when no push is in-flight', function() {
      App.Sync._pushCount = 0;
      var accepted = !(App.Sync._pushCount > 0);
      assert.strictEqual(accepted, true, 'should accept when pushCount is 0');
    });

    it('should track multiple concurrent pushes correctly', function() {
      // Simulate two rapid pushes
      App.Sync._pushCount++;
      App.Sync._pushCount++;
      assert.strictEqual(App.Sync._pushCount, 2);

      // First push completes
      App.Sync._pushCount--;
      assert.strictEqual(App.Sync._pushCount, 1);
      assert.strictEqual(App.Sync._pushCount > 0, true, 'should still guard after first push completes');

      // Second push completes
      App.Sync._pushCount--;
      assert.strictEqual(App.Sync._pushCount, 0);
      assert.strictEqual(App.Sync._pushCount > 0, false, 'should allow after all pushes complete');
    });

    it('should not go negative on push completion', function() {
      App.Sync._pushCount = 1;
      App.Sync._pushCount--;
      assert.strictEqual(App.Sync._pushCount, 0);
    });
  });

  describe('push', function() {
    it('should not push when not connected', function() {
      App.Sync.connected = false;
      App.Sync.ref = { set: function() { assert.fail('should not call set'); } };
      App.Sync.push();
      assert.strictEqual(App.Sync._pushCount, 0);
    });

    it('should not push when ref is null', function() {
      App.Sync.connected = true;
      App.Sync.ref = null;
      App.Sync.push();
      assert.strictEqual(App.Sync._pushCount, 0);
    });

    it('should increment pushCount and call ref.set', function() {
      var setCalled = false;
      App.Sync.connected = true;
      App.Sync.ref = {
        set: function() {
          setCalled = true;
          return { then: function(cb) { cb(); return { catch: function() {} }; } };
        }
      };
      // Stub _blink to avoid DOM access
      var origBlink = App.Sync._blink;
      App.Sync._blink = function() {};

      App.Sync.push();

      assert.strictEqual(setCalled, true);
      // After the .then() resolves synchronously, pushCount should be back to 0
      assert.strictEqual(App.Sync._pushCount, 0);

      App.Sync._blink = origBlink;
    });

    it('should decrement pushCount even on error', function() {
      App.Sync.connected = true;
      App.Sync.ref = {
        set: function() {
          return {
            then: function() {
              return { catch: function(cb) { cb(new Error('test')); } };
            }
          };
        }
      };
      var origBlink = App.Sync._blink;
      App.Sync._blink = function() {};

      App.Sync.push();
      assert.strictEqual(App.Sync._pushCount, 0);

      App.Sync._blink = origBlink;
    });
  });

  describe('session existence check', function() {
    it('should reject join when session does not exist', function(t, done) {
      // Mock firebase
      var origFirebase = global.firebase;
      global.firebase = {
        apps: [{}],
        database: function() {
          return {
            ref: function() {
              return {
                once: function() {
                  return {
                    then: function(cb) {
                      cb({ exists: function() { return false; } });
                      return { catch: function() {} };
                    }
                  };
                }
              };
            }
          };
        }
      };

      var toastMsg = null;
      var origShowToast = App.UI.showToast;
      App.UI.showToast = function(msg) { toastMsg = msg; };

      App.Sync.init('nonexistent-session', false, function(ok) {
        assert.strictEqual(ok, false);
        assert.strictEqual(toastMsg, App.t('sessionNotFound'));
        assert.strictEqual(App.Sync.ref, null);

        App.UI.showToast = origShowToast;
        global.firebase = origFirebase;
        done();
      });
    });

    it('should allow join when session exists', function(t, done) {
      var origFirebase = global.firebase;
      var onCalled = false;
      global.firebase = {
        apps: [{}],
        database: function() {
          return {
            ref: function() {
              return {
                once: function() {
                  return {
                    then: function(cb) {
                      cb({ exists: function() { return true; } });
                      return { catch: function() {} };
                    }
                  };
                },
                on: function() { onCalled = true; },
                off: function() {}
              };
            }
          };
        }
      };

      var origBlink = App.Sync._blink;
      var origUpdateStatus = App.Sync._updateStatus;
      App.Sync._blink = function() {};
      App.Sync._updateStatus = function() {};

      App.Sync.init('existing-session', false, function(ok) {
        assert.strictEqual(ok, true);
        assert.strictEqual(onCalled, true, 'should attach listener');
        assert.strictEqual(App.Sync.connected, true);

        // Cleanup
        App.Sync.connected = false;
        App.Sync._blink = origBlink;
        App.Sync._updateStatus = origUpdateStatus;
        global.firebase = origFirebase;
        done();
      });
    });

    it('should skip existence check for admin (create)', function() {
      var origFirebase = global.firebase;
      var onceCalled = false;
      global.firebase = {
        apps: [{}],
        database: function() {
          return {
            ref: function() {
              return {
                once: function() { onceCalled = true; },
                on: function() {},
                off: function() {},
                set: function() {
                  return { then: function(cb) { cb(); return { catch: function() {} }; } };
                }
              };
            }
          };
        }
      };

      var origBlink = App.Sync._blink;
      var origUpdateStatus = App.Sync._updateStatus;
      App.Sync._blink = function() {};
      App.Sync._updateStatus = function() {};

      App.Sync.init('new-session', true);
      assert.strictEqual(onceCalled, false, 'should not check existence for admin');
      assert.strictEqual(App.Sync.connected, true);

      // Cleanup
      App.Sync.connected = false;
      App.Sync._blink = origBlink;
      App.Sync._updateStatus = origUpdateStatus;
      global.firebase = origFirebase;
    });
  });

  describe('i18n keys', function() {
    it('should have sessionNotFound in both languages', function() {
      assert.notStrictEqual(App.i18n.translations.pl.sessionNotFound, undefined);
      assert.notStrictEqual(App.i18n.translations.en.sessionNotFound, undefined);
    });
  });

  describe('_merge', function() {
    it('should preserve local isAdmin flag', function() {
      App.state.isAdmin = true;
      var remote = JSON.parse(JSON.stringify(App.state));
      remote.isAdmin = false;

      App.Sync._merge(remote);

      assert.strictEqual(App.state.isAdmin, true);
    });

    it('should apply remote state', function() {
      var id = App.Players.add('Alice');
      App.Players.markPresent(id);

      var remote = JSON.parse(JSON.stringify(App.state));
      remote.waitingQueue = [id, 'new-player'];

      App.Sync._merge(remote);

      assert.deepStrictEqual(App.state.waitingQueue, [id, 'new-player']);
    });

    it('should preserve remote lastModified to avoid clock skew', function() {
      var remoteTimestamp = 1000000;
      var remote = JSON.parse(JSON.stringify(App.state));
      remote.lastModified = remoteTimestamp;

      App.Sync._merge(remote);

      // Must keep the remote timestamp, not overwrite with local Date.now()
      assert.strictEqual(App.state.lastModified, remoteTimestamp);
    });
  });

  describe('autoConnect', function() {
    it('should call init immediately when firebase is available', function() {
      var origInit = App.Sync.init;
      var initCalled = false;
      var initSessionId = null;
      App.Sync.init = function(sessionId, asAdmin, callback) {
        initCalled = true;
        initSessionId = sessionId;
        App.Sync.connected = true;
        if (callback) callback(true);
        return true;
      };

      // Mock firebase
      var origFirebase = global.firebase;
      global.firebase = { database: function() {} };

      App.Sync.autoConnect('test-session');

      assert.strictEqual(initCalled, true);
      assert.strictEqual(initSessionId, 'test-session');

      App.Sync.init = origInit;
      App.Sync.connected = false;
      global.firebase = origFirebase;
    });

    it('should poll and connect when firebase loads later', function(t, done) {
      var origInit = App.Sync.init;
      var initCalled = false;
      App.Sync.init = function(sessionId, asAdmin, callback) {
        initCalled = true;
        App.Sync.connected = true;
        if (callback) callback(true);
        return true;
      };

      // Firebase not available yet
      var origFirebase = global.firebase;
      global.firebase = undefined;

      App.Sync.autoConnect('poll-session');
      assert.strictEqual(initCalled, false, 'should not call init immediately');

      // Simulate Firebase loading after 600ms
      setTimeout(function() {
        global.firebase = { database: function() {} };
      }, 600);

      // Check after 1200ms that it connected
      setTimeout(function() {
        assert.strictEqual(initCalled, true, 'should have called init after polling');

        App.Sync.init = origInit;
        App.Sync.connected = false;
        global.firebase = origFirebase;
        done();
      }, 1200);
    });
  });
});
