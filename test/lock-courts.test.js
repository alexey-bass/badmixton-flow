var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

function listeners(id) {
  var el = document.getElementById(id);
  var fns = [];
  el.addEventListener = function(type, fn) { fns.push(fn); };
  return fns;
}

function addPresent(name) {
  var id = App.Players.add(name);
  App.Players.markPresent(id);
  return id;
}

function pad(n) { return (n < 10 ? '0' : '') + n; }

describe('Unlock after auto-lock (#64)', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1, 2]);
  });

  it('stays unlocked after the admin unlocks a fired auto-lock', function() {
    App.state.settings.autoLockTime = '00:00'; // always in the past
    App.Lock.checkAutoLock();
    assert.strictEqual(App.state.settings.locked, true, 'auto-lock fired');

    App.Lock.unlock();
    assert.strictEqual(App.state.settings.locked, false, 'unlocked');
    assert.strictEqual(App.state.settings.autoLockTime, null, 'fired auto-lock is cleared');

    App.save(); // runs checkAutoLock again, as every save does
    assert.strictEqual(App.state.settings.locked, false, 'does not re-lock on the next save');
  });

  it('keeps a future auto-lock time when unlocking manually', function(t) {
    var h = new Date().getHours() + 1;
    if (h >= 24) { t.skip('too close to midnight for a future time today'); return; }
    var future = pad(h) + ':00';
    App.state.settings.autoLockTime = future;
    App.Lock.lock();
    App.Lock.unlock();
    assert.strictEqual(App.state.settings.locked, false);
    assert.strictEqual(App.state.settings.autoLockTime, future, 'future auto-lock still armed');
  });
});

describe('Removing an occupied court (#65)', function() {
  var ids;
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1, 2, 3]);
    ids = ['A', 'B', 'C', 'D'].map(addPresent);
    App.Courts.startGame('c_3', [ids[0], ids[1]], [ids[2], ids[3]]);
  });

  it('refuses to drop a court with a game in progress and changes nothing', function() {
    var result = App.Session.initCourts([1, 2]);
    assert.strictEqual(result, false);
    assert.deepStrictEqual(Object.keys(App.state.courts).sort(), ['c_1', 'c_2', 'c_3']);
    assert.strictEqual(App.state.courts.c_3.occupied, true);
    assert.strictEqual(App.Players.isOnCourt(ids[0]), true);
  });

  it('still allows adding courts and keeps the running game', function() {
    var result = App.Session.initCourts([1, 2, 3, 4]);
    assert.strictEqual(result, true);
    assert.deepStrictEqual(Object.keys(App.state.courts).sort(), ['c_1', 'c_2', 'c_3', 'c_4']);
    assert.strictEqual(App.state.courts.c_3.occupied, true);
  });

  it('allows dropping the court once its game is finished', function() {
    App.Courts.finishGame('c_3', '21-15');
    assert.strictEqual(App.Session.initCourts([1, 2]), true);
    assert.deepStrictEqual(Object.keys(App.state.courts).sort(), ['c_1', 'c_2']);
  });

  it('Apply courts button shows a toast and keeps the court', function() {
    var apply = listeners('btnApplyCourts');
    App.UI._bindDashboard();
    document.getElementById('courtNumbers').value = '1,2';
    var toasts = [];
    var origToast = App.UI.showToast;
    App.UI.showToast = function(msg) { toasts.push(msg); };
    apply[0]();
    App.UI.showToast = origToast;

    assert.deepStrictEqual(toasts, [App.t('courtOccupiedCannotRemove')]);
    assert.ok(App.state.courts.c_3, 'court 3 kept');
  });

  it('has the refusal message in both languages', function() {
    assert.ok(App.i18n.translations.pl.courtOccupiedCannotRemove);
    assert.ok(App.i18n.translations.en.courtOccupiedCannotRemove);
  });
});

describe('Lock bypass via emoji picker (#75)', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1]);
    document.getElementById('emojiPicker').hidden = true;
  });

  it('_doAddPlayer adds nothing while locked', function() {
    App.Lock.lock();
    App.UI._doAddPlayer('Ola');
    assert.strictEqual(Object.keys(App.state.players).length, 0);
  });

  it('emoji toggle does not open the picker while locked', function() {
    var toggle = listeners('btnEmojiToggle');
    App.UI._bindPlayers();
    document.getElementById('playerNameInput').value = 'Ola';
    App.Lock.lock();
    toggle[0]();
    assert.strictEqual(document.getElementById('emojiPicker').hidden, true);
  });

  it('an already-open picker adds nothing once the session locks', function() {
    App.UI._showEmojiPicker('Ola', 'emojiPickName');
    var chips = document.getElementById('emojiChips');
    assert.strictEqual(typeof chips.onclick, 'function', 'picker is open');
    App.Lock.lock();
    chips.onclick({ target: { closest: function() { return { dataset: { emoji: '🐶' } }; } } });
    assert.strictEqual(Object.keys(App.state.players).length, 0);
  });

  it('picker still adds a player when unlocked', function() {
    App.UI._showEmojiPicker('Ola', 'emojiPickName');
    document.getElementById('emojiChips').onclick({ target: { closest: function() { return { dataset: { emoji: '🐶' } }; } } });
    var names = Object.values(App.state.players).map(function(p) { return p.name; });
    assert.deepStrictEqual(names, ['Ola 🐶']);
  });
});
