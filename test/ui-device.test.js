var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');
var { loadApp } = require('./helpers');

var App = loadApp();

App.UI.showModal = function(html) {
  document.getElementById('modalContent').innerHTML = html;
  this._customSwapTarget = null;
};

function listeners(id) {
  var el = document.getElementById(id);
  var fns = {};
  el.addEventListener = function(type, fn) { fns[type] = fn; };
  return fns;
}

function createQueue(names) {
  App.Session.create('Test', 'queue');
  App.Session.initCourts([1]);
  return names.map(function(n) { var id = App.Players.add(n); App.Players.markPresent(id); return id; });
}

describe('Score validation (#92)', function() {
  beforeEach(function() { localStorage.clear(); });

  it('finish modal rejects a negative score and keeps the game running', function() {
    var ids = createQueue(['A', 'B', 'C', 'D']);
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    var confirm = listeners('btnFinishConfirm');
    App.UI._showFinishConfirm('c_1');
    var toasts = [];
    var orig = App.UI.showToast;
    App.UI.showToast = function(m) { toasts.push(m); };

    document.getElementById('finishScoreA').value = '-5';
    document.getElementById('finishScoreB').value = '3';
    confirm.click();
    assert.deepStrictEqual(toasts, [App.t('scoreInvalid')]);
    assert.strictEqual(App.state.courts.c_1.occupied, true, 'game still running');

    document.getElementById('finishScoreA').value = '21';
    document.getElementById('finishScoreB').value = '';
    confirm.click();
    assert.strictEqual(toasts.length, 2, 'one empty field is also rejected');

    document.getElementById('finishScoreA').value = '21';
    document.getElementById('finishScoreB').value = '15';
    confirm.click();
    App.UI.showToast = orig;
    var m = Object.values(App.state.matches)[0];
    assert.strictEqual(m.status, 'finished');
    assert.strictEqual(m.score, '21-15');
    assert.strictEqual(m.winner, 'teamA');
  });

  it('core ignores a malformed score so the declared winner still counts', function() {
    var ids = createQueue(['A', 'B', 'C', 'D']);
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    App.Courts.finishGame('c_1', '-5-3', 'teamB');
    var m = Object.values(App.state.matches)[0];
    assert.strictEqual(m.score, null, 'malformed score not stored');
    assert.strictEqual(App.state.players[ids[2]].wins, 1, 'declared winner counted');
    assert.strictEqual(App.state.players[ids[0]].losses, 1);
  });

  it('core accepts a colon separator and stores the dash form', function() {
    var ids = createQueue(['A', 'B', 'C', 'D']);
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    App.Courts.finishGame('c_1', '21:15');
    var m = Object.values(App.state.matches)[0];
    assert.strictEqual(m.score, '21-15');
    assert.strictEqual(App.state.players[ids[0]].pointsScored, 21);
    assert.strictEqual(App.state.players[ids[2]].pointsScored, 15);
  });
});

describe('Wake lock re-acquire (#93)', function() {
  beforeEach(function() { localStorage.clear(); App.UI._wakeLock = null; App.UI._wakeLockWanted = false; });

  function fakeLock() {
    var handlers = {};
    return {
      addEventListener: function(ev, fn) { handlers[ev] = fn; },
      release: function() { if (handlers.release) handlers.release(); return Promise.resolve(); },
      fire: function(ev) { if (handlers[ev]) handlers[ev](); }
    };
  }

  it('re-acquires on return to the tab after the browser released the lock', async function() {
    var requests = 0;
    var locks = [];
    global.navigator.wakeLock = { request: function() { requests++; var l = fakeLock(); locks.push(l); return Promise.resolve(l); } };
    var docHandlers = {};
    var origAdd = document.addEventListener;
    document.addEventListener = function(ev, fn) { docHandlers[ev] = fn; };
    var btn = listeners('btnWakeLock');

    App.UI._bindWakeLock();
    btn.click();
    await new Promise(function(r) { setImmediate(r); });
    assert.strictEqual(requests, 1);
    assert.strictEqual(App.UI._wakeLockWanted, true);

    // Tab hidden: browser releases the lock (button state is cleared)
    locks[0].fire('release');
    assert.strictEqual(App.UI._wakeLock, null);

    document.visibilityState = 'visible';
    docHandlers.visibilitychange();
    await new Promise(function(r) { setImmediate(r); });
    assert.strictEqual(requests, 2, 'lock requested again on return');
    assert.strictEqual(App.UI._wakeLock, locks[1]);

    // User switches it off: no re-acquire any more
    btn.click();
    assert.strictEqual(App.UI._wakeLockWanted, false);
    docHandlers.visibilitychange();
    await new Promise(function(r) { setImmediate(r); });
    assert.strictEqual(requests, 2);

    document.addEventListener = origAdd;
    delete global.navigator.wakeLock;
  });
});

describe('Touch drag cancel (#94)', function() {
  beforeEach(function() { localStorage.clear(); });

  function fakeItem(id) {
    var classes = {};
    var item = {
      dataset: { id: id, index: 0 },
      classList: { add: function(c) { classes[c] = true; }, remove: function(c) { delete classes[c]; }, has: function(c) { return !!classes[c]; } },
      offsetWidth: 100,
      getBoundingClientRect: function() { return { left: 0, top: 0 }; },
      cloneNode: function() { return { style: {}, removed: false, remove: function() { this.removed = true; } }; }
    };
    item.closest = function(sel) { return sel === '.queue-item' ? item : null; };
    return item;
  }

  it('touchcancel removes the clone and the drag state, and a later touchend does not reorder', function() {
    var ids = createQueue(['A', 'B', 'C']);
    var handlers = {};
    var container = { addEventListener: function(ev, fn) { handlers[ev] = fn; }, querySelectorAll: function() { return []; } };
    var appended = [];
    document.body.appendChild = function(el) { appended.push(el); };
    App.DnD._initTouch(container);

    var item = fakeItem(ids[0]);
    var handle = { closest: function(sel) { return sel === '.drag-handle' ? handle : item; } };
    handlers.touchstart({ target: handle, touches: [{ clientY: 10 }] });
    assert.strictEqual(App.DnD.draggedId, ids[0]);
    assert.strictEqual(appended.length, 1, 'clone appended');
    assert.ok(item.classList.has('dragging'));

    handlers.touchcancel({});
    assert.strictEqual(appended[0].removed, true, 'clone removed');
    assert.ok(!item.classList.has('dragging'));
    assert.strictEqual(App.DnD.draggedId, null);

    var moved = false;
    var origMove = App.Queue.move;
    App.Queue.move = function() { moved = true; };
    document.elementFromPoint = function() { return fakeItem(ids[1]); };
    handlers.touchend({ changedTouches: [{ clientX: 0, clientY: 0 }] });
    App.Queue.move = origMove;
    assert.strictEqual(moved, false, 'no reorder after a cancelled drag');
  });
});

describe('Translation keys (#97)', function() {
  it('every key used in app.js and index.html exists in both languages', function() {
    var dir = path.resolve(__dirname, '..');
    var used = {};
    ['assets/js/app.js', 'index.html'].forEach(function(f) {
      var src = fs.readFileSync(path.join(dir, f), 'utf8');
      var re = /App\.t\(\s*['"]([A-Za-z0-9_]+)['"]|data-i18n(?:-placeholder|-title|-opt)?="([A-Za-z0-9_]+)"/g;
      var m;
      while ((m = re.exec(src)) !== null) used[m[1] || m[2]] = true;
    });
    var missing = { pl: [], en: [] };
    Object.keys(used).forEach(function(k) {
      if (!(k in App.i18n.translations.pl)) missing.pl.push(k);
      if (!(k in App.i18n.translations.en)) missing.en.push(k);
    });
    assert.deepStrictEqual(missing, { pl: [], en: [] });
    assert.ok(Object.keys(used).length > 200, 'sanity: keys were actually scanned');
  });
});

describe('Fullscreen button (#98)', function() {
  it('is hidden when element fullscreen is unsupported', function() {
    var root = document.documentElement;
    delete root.requestFullscreen;
    delete root.webkitRequestFullscreen;
    var btn = document.getElementById('btnFullscreen');
    btn.hidden = false;
    App.UI._bindFullscreen();
    assert.strictEqual(btn.hidden, true);
  });

  it('calls requestFullscreen when supported and never throws', function() {
    var root = document.documentElement;
    var calls = 0;
    root.requestFullscreen = function() { calls++; return Promise.reject(new Error('denied')); };
    var btn = listeners('btnFullscreen');
    document.getElementById('btnFullscreen').hidden = false;
    App.UI._bindFullscreen();
    assert.strictEqual(document.getElementById('btnFullscreen').hidden, false);
    assert.doesNotThrow(function() { btn.click(); });
    assert.strictEqual(calls, 1);
    delete root.requestFullscreen;
  });
});
