var { describe, it, beforeEach, afterEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

// A small stateful Firebase stand-in: one ref per session path, listeners,
// a store the refs read/write, synchronous local echo on set (like the real
// SDK), and optional held set() promises to simulate a push in flight.
function fakeFirebase(store) {
  var refs = {};
  function makeRef(id) {
    var ref = {
      id: id,
      listeners: [],
      sets: [],
      holdSets: false,
      pending: [],
      // Like the SDK, deliver the current value right after attaching
      on: function(ev, cb) { ref.listeners.push(cb); cb({ val: function() { return store[id] || null; } }); return cb; },
      off: function(ev, cb) { var i = ref.listeners.indexOf(cb); if (i !== -1) ref.listeners.splice(i, 1); },
      once: function() {
        var exists = !!store[id];
        return { then: function(cb) { cb({ exists: function() { return exists; }, val: function() { return store[id] || null; } }); return { catch: function() {} }; } };
      },
      emit: function(state) {
        ref.listeners.slice().forEach(function(cb) { cb({ val: function() { return state; } }); });
      },
      set: function(state) {
        var copy = JSON.parse(JSON.stringify(state));
        ref.sets.push(copy);
        store[id] = copy;
        ref.emit(copy); // local echo
        var resolve = null;
        var thenable = { then: function(cb) { resolve = cb; if (!ref.holdSets) cb(); else ref.pending.push(function() { cb(); }); return { catch: function() {} }; } };
        return thenable;
      },
      flush: function() { var p = ref.pending; ref.pending = []; p.forEach(function(fn) { fn(); }); }
    };
    return ref;
  }
  var fb = {
    apps: [{}],
    refs: refs,
    database: function() {
      return { ref: function(path) { var id = path.replace('sessions/', ''); if (!refs[id]) refs[id] = makeRef(id); return refs[id]; } };
    }
  };
  return fb;
}

// Build a state object for the fake store without disturbing App.state or
// the local copy of that session.
function remoteState(sessionId, lastModified, playerNames) {
  var keep = App.state;
  var keepLocal = localStorage.getItem('bs_' + sessionId);
  App.Session.create('Remote', 'queue');
  App.Session.initCourts([1]);
  App.state.sessionId = sessionId;
  playerNames.forEach(function(n) { App.Players.markPresent(App.Players.add(n)); });
  var s = JSON.parse(JSON.stringify(App.state));
  s.lastModified = lastModified;
  s.settings.syncEnabled = true;
  s.isAdmin = true;
  App.state = keep;
  if (keepLocal === null) localStorage.removeItem('bs_' + sessionId); else localStorage.setItem('bs_' + sessionId, keepLocal);
  return s;
}

function names() { return Object.values(App.state.players).map(function(p) { return p.name; }).sort(); }

describe('Sync roles and listener lifecycle (#66, #67, #78, #79)', function() {
  var origFirebase, origBlink, store, fb, replaced;

  beforeEach(function() {
    localStorage.clear();
    origFirebase = global.firebase;
    origBlink = App.Sync._blink;
    App.Sync._blink = function() {};
    App.Sync._detach();
    App.Sync.ref = null;
    store = {};
    fb = fakeFirebase(store);
    global.firebase = fb;
    replaced = [];
    global.history.replaceState = function(a, b, url) { replaced.push(url); };
    App.Session.create('Local', 'queue');
    App.Session.initCourts([1]);
  });

  afterEach(function() {
    App.Sync._detach();
    App.Sync.ref = null;
    global.firebase = origFirebase;
    App.Sync._blink = origBlink;
    global.history.replaceState = function() {};
  });

  it('#66 a joining device takes the remote state and never pushes', function() {
    store.S1 = remoteState('S1', 2000, ['Ola', 'Aleks']);
    App.Session.create('Local', 'queue');

    App.Sync.init('S1', false);

    assert.strictEqual(App.state.sessionId, 'S1');
    assert.strictEqual(App.state.isAdmin, false);
    assert.deepStrictEqual(names(), ['Aleks', 'Ola']);
    assert.strictEqual(fb.refs.S1.sets.length, 0, 'viewer must not overwrite the session');
  });

  it('#66 a reloaded viewer reconnects as viewer and adopts the newer remote copy', function() {
    store.S1 = remoteState('S1', 2000, ['Ola', 'Aleks']);
    App.Session.create('Local', 'queue');
    App.Sync.init('S1', false);
    App.Sync._detach();

    // Admin keeps working while this device is closed
    store.S1 = remoteState('S1', 3000, ['Ola', 'Aleks', 'Marek']);

    // Reload: local copy of S1 is loaded, then auto-reconnect with stored role
    App.state = App.Storage.load('S1');
    assert.strictEqual(App.state.isAdmin, false, 'role persisted in the local copy');
    assert.strictEqual(App.state.settings.syncEnabled, true);
    App.Sync.autoConnect('S1', App.state.isAdmin !== false);

    assert.strictEqual(fb.refs.S1.sets.length, 0, 'no stale push on reconnect');
    assert.deepStrictEqual(names(), ['Aleks', 'Marek', 'Ola'], 'live state adopted');
  });

  it('#66 an admin reconnect adopts a newer remote copy instead of overwriting it', function() {
    App.state.sessionId = 'S1';
    App.Players.markPresent(App.Players.add('Ola'));
    App.save();
    store.S1 = remoteState('S1', App.state.lastModified + 5000, ['Ola', 'Marek']);
    App.state = App.Storage.load('S1') || App.state;

    App.Sync.autoConnect('S1');

    assert.strictEqual(fb.refs.S1.sets.length, 0, 'older local copy is not pushed');
    assert.deepStrictEqual(names(), ['Marek', 'Ola']);
    assert.strictEqual(App.state.isAdmin, true);
  });

  it('#66 an admin connect publishes local state when remote is missing or older', function() {
    App.state.sessionId = 'S1';
    App.Players.markPresent(App.Players.add('Ola'));
    App.save();

    App.Sync.autoConnect('S1');

    assert.strictEqual(fb.refs.S1.sets.length, 1, 'local state pushed');
    assert.deepStrictEqual(Object.values(store.S1.players).map(function(p) { return p.name; }), ['Ola']);
  });

  it('#67 New Session detaches the old listener so the old session cannot overwrite the new one', function() {
    App.state.sessionId = 'S1';
    App.save();
    App.Sync.autoConnect('S1');
    assert.strictEqual(fb.refs.S1.listeners.length, 1);

    // New Session flow (same calls as the modal handler)
    App.Session.create('Second', 'queue');
    App.Session.initCourts([1]);
    var newId = App.state.sessionId;
    App.Sync.autoConnect(newId);

    assert.strictEqual(fb.refs.S1.listeners.length, 0, 'old listener detached');
    assert.strictEqual(fb.refs[newId].listeners.length, 1);

    // A late update on the old session must be ignored
    fb.refs.S1.emit(remoteState('S1', Date.now() + 60000, ['Ghost']));
    assert.strictEqual(App.state.sessionId, newId);
    assert.deepStrictEqual(names(), []);
  });

  it('#78 manual Join updates the URL and makes the joined session the last one', function() {
    store.S1 = remoteState('S1', 2000, ['Ola']);
    App.Session.create('Local', 'queue');
    var localId = App.state.sessionId;
    var join = [];
    document.getElementById('btnJoinSession').addEventListener = function(t, fn) { join.push(fn); };
    App.UI._bindSync();
    document.getElementById('sessionIdInput').value = 'S1';

    join[0]();

    assert.strictEqual(App.state.sessionId, 'S1');
    assert.ok(replaced.some(function(u) { return u.indexOf('session=S1') !== -1; }), 'URL updated');
    assert.strictEqual(localStorage.getItem('bs_last'), 'S1');
    var pre = App.Storage.load(localId);
    assert.strictEqual(pre.settings.syncEnabled, false, 'pre-join local session left untouched');
  });

  it('#79 a remote update that arrives during a push is applied once the push settles', function() {
    App.state.sessionId = 'S1';
    App.save();
    App.Sync.autoConnect('S1');
    var ref = fb.refs.S1;

    ref.holdSets = true;
    App.Players.markPresent(App.Players.add('Ola'));
    App.save(); // push(es) in flight
    assert.ok(App.Sync._pushCount > 0);

    var newer = JSON.parse(JSON.stringify(App.state));
    newer.lastModified = App.state.lastModified + 1000;
    var marek = JSON.parse(JSON.stringify(Object.values(newer.players)[0]));
    marek.id = 'p_remote'; marek.name = 'Marek'; marek.number = 2;
    newer.players.p_remote = marek;
    ref.emit(newer);
    assert.deepStrictEqual(names(), ['Ola'], 'not applied while push in flight');

    ref.flush();
    assert.strictEqual(App.Sync._pushCount, 0);
    assert.deepStrictEqual(names(), ['Marek', 'Ola'], 'applied after the push settled');
  });
});
