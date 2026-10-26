var { describe, it, beforeEach, afterEach } = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('View-only mode (#108)', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1, 2]);
  });

  describe('App.Lock.isViewOnly', function() {
    it('is off by default', function() {
      assert.strictEqual(App.Lock.isViewOnly(), false);
      assert.strictEqual(App.Lock.isReadOnly(), false);
    });

    it('is on when the device flag is set and the UI is in player mode', function() {
      localStorage.setItem('badminton_viewonly', '1');
      assert.strictEqual(App.Lock.isViewOnly(), true, 'no saved mode = player mode');
      localStorage.setItem('badminton_mode', 'player');
      assert.strictEqual(App.Lock.isViewOnly(), true);
    });

    it('is lifted by admin mode (behind the password)', function() {
      localStorage.setItem('badminton_viewonly', '1');
      localStorage.setItem('badminton_mode', 'admin');
      assert.strictEqual(App.Lock.isViewOnly(), false);
    });

    it('is always on for a device that joined as viewer, even in admin mode', function() {
      App.state.isAdmin = false;
      localStorage.setItem('badminton_mode', 'admin');
      assert.strictEqual(App.Lock.isViewOnly(), true);
      assert.strictEqual(App.Lock.isReadOnly(), true);
    });

    it('is a device setting, not session state', function() {
      localStorage.setItem('badminton_viewonly', '1');
      App.save();
      var saved = App.Storage.load(App.state.sessionId);
      assert.strictEqual(saved.settings.viewOnly, undefined);
      assert.strictEqual(JSON.stringify(saved).indexOf('viewonly'), -1);
    });
  });

  describe('App.Lock.isReadOnly', function() {
    it('is true when locked, when view-only, and when both', function() {
      App.state.settings.locked = true;
      assert.strictEqual(App.Lock.isReadOnly(), true);
      App.state.settings.locked = false;
      localStorage.setItem('badminton_viewonly', '1');
      assert.strictEqual(App.Lock.isReadOnly(), true);
      App.state.settings.locked = true;
      assert.strictEqual(App.Lock.isReadOnly(), true);
    });

    it('does not turn the session lock on', function() {
      localStorage.setItem('badminton_viewonly', '1');
      assert.strictEqual(App.Lock.isLocked(), false);
      assert.strictEqual(App.state.settings.locked, false);
    });
  });

  describe('mutation guards', function() {
    it('blocks adding a player from the UI while view-only', function() {
      localStorage.setItem('badminton_viewonly', '1');
      App.UI._doAddPlayer('Aleks');
      assert.strictEqual(Object.keys(App.state.players).length, 0);
      localStorage.removeItem('badminton_viewonly');
      App.UI._doAddPlayer('Ola');
      assert.strictEqual(Object.keys(App.state.players).length, 1);
    });

    it('blocks adding a player on a viewer device', function() {
      App.state.isAdmin = false;
      App.UI._doAddPlayer('Aleks');
      assert.strictEqual(Object.keys(App.state.players).length, 0);
    });

    it('ignores Board finish/cancel taps while view-only', function() {
      var courts = document.getElementById('boardCourts');
      var handler = null;
      var origAdd = courts.addEventListener;
      courts.addEventListener = function(ev, fn) { if (ev === 'click') handler = fn; };
      App.UI._bindBoardActions();
      courts.addEventListener = origAdd;
      assert.ok(handler, 'click handler bound');

      var finishCalls = 0;
      var origFinish = App.UI._showFinishConfirm;
      App.UI._showFinishConfirm = function() { finishCalls++; };
      var btn = { dataset: { action: 'board-finish', court: 'c_1' } };
      var evt = { target: { closest: function() { return btn; } } };

      localStorage.setItem('badminton_viewonly', '1');
      handler(evt);
      assert.strictEqual(finishCalls, 0, 'view-only: no finish modal');

      localStorage.removeItem('badminton_viewonly');
      handler(evt);
      assert.strictEqual(finishCalls, 1, 'normal: finish modal opens');
      App.UI._showFinishConfirm = origFinish;
    });

    it('still lets the zoom button work while view-only (device setting)', function() {
      var btn = document.getElementById('btnZoom');
      var handler = null;
      var origAdd = btn.addEventListener;
      btn.addEventListener = function(ev, fn) { handler = fn; };
      App.UI._bindZoom();
      btn.addEventListener = origAdd;
      localStorage.setItem('badminton_viewonly', '1');
      handler();
      assert.strictEqual(localStorage.getItem('badminton_zoom'), '1.25');
    });
  });

  describe('_applyViewOnly', function() {
    var toggles;
    var origAdd, origRemove;
    beforeEach(function() {
      toggles = {};
      origAdd = document.body.classList.add;
      origRemove = document.body.classList.remove;
      document.body.classList.add = function(cls) { toggles[cls] = true; };
      document.body.classList.remove = function(cls) { toggles[cls] = false; };
    });
    afterEach(function() {
      document.body.classList.add = origAdd;
      document.body.classList.remove = origRemove;
    });

    it('sets body.view-only and shows the header indicator', function() {
      localStorage.setItem('badminton_viewonly', '1');
      App.UI._applyViewOnly();
      assert.strictEqual(toggles['view-only'], true);
      assert.strictEqual(document.getElementById('viewOnlyIndicator').hidden, false);
      assert.strictEqual(document.getElementById('viewOnlyDevice').checked, true);
    });

    it('clears body.view-only and hides the indicator when off', function() {
      App.UI._applyViewOnly();
      assert.strictEqual(toggles['view-only'], false);
      assert.strictEqual(document.getElementById('viewOnlyIndicator').hidden, true);
      assert.strictEqual(document.getElementById('viewOnlyDevice').checked, false);
    });

    it('runs from renderAll, like the lock state', function() {
      localStorage.setItem('badminton_viewonly', '1');
      App.UI.renderAll();
      assert.strictEqual(toggles['view-only'], true);
    });
  });

  describe('Session tab checkbox', function() {
    var cb, handler;
    beforeEach(function() {
      cb = document.getElementById('viewOnlyDevice');
      handler = null;
      var origAdd = cb.addEventListener;
      cb.addEventListener = function(ev, fn) { if (ev === 'change') handler = fn; };
      App.UI._bindViewOnly();
      cb.addEventListener = origAdd;
    });

    it('ticking it stores the flag, switches to player mode and shows the Board', function() {
      var modes = [], tabs = [];
      var origSet = App.UI._setMode, origTab = App.UI.showTab;
      App.UI._setMode = function(isAdmin) { modes.push(isAdmin); localStorage.setItem('badminton_mode', isAdmin ? 'admin' : 'player'); };
      App.UI.showTab = function(t) { tabs.push(t); };
      localStorage.setItem('badminton_mode', 'admin');

      cb.checked = true;
      handler();

      assert.strictEqual(localStorage.getItem('badminton_viewonly'), '1');
      assert.deepStrictEqual(modes, [false]);
      assert.deepStrictEqual(tabs, ['board']);
      assert.strictEqual(App.Lock.isViewOnly(), true);
      App.UI._setMode = origSet; App.UI.showTab = origTab;
    });

    it('unticking it removes the flag', function() {
      localStorage.setItem('badminton_viewonly', '1');
      cb.checked = false;
      handler();
      assert.strictEqual(localStorage.getItem('badminton_viewonly'), null);
      assert.strictEqual(App.Lock.isViewOnly(), false);
    });

    it('reflects the stored flag on bind', function() {
      localStorage.setItem('badminton_viewonly', '1');
      App.UI._bindViewOnly();
      assert.strictEqual(cb.checked, true);
    });
  });

  describe('share links', function() {
    it('builds a TV link with view=1 next to the share link', function() {
      assert.strictEqual(App.UI._buildShareUrl('bf-abc'), 'http://localhost:8080/?session=bf-abc');
      assert.strictEqual(App.UI._buildViewUrl('bf-abc'), 'http://localhost:8080/?session=bf-abc&view=1');
    });

    it('renderSync fills both link inputs when connected', function() {
      App.Sync.connected = true;
      App.UI.renderSync();
      App.Sync.connected = false;
      assert.strictEqual(document.getElementById('syncShareUrl').value, 'http://localhost:8080/?session=' + App.state.sessionId);
      assert.strictEqual(document.getElementById('syncViewUrl').value, 'http://localhost:8080/?session=' + App.state.sessionId + '&view=1');
    });
  });

  describe('markup and i18n', function() {
    var html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf-8');

    it('has the hidden header indicator, the Session tab checkbox and the TV link row', function() {
      assert.ok(html.match(/id="viewOnlyIndicator"[^>]*hidden/), 'indicator hidden by default');
      assert.ok(html.includes('id="viewOnlyDevice"'));
      assert.ok(html.includes('id="syncViewUrl"'));
      assert.ok(html.includes('id="btnCopyViewLink"'));
    });

    it('has translations in both languages', function() {
      ['viewOnlyTitle', 'viewOnlyDesc', 'viewOnlyDeviceLabel', 'viewOnlyEnabled', 'viewOnlyTooltip', 'viewLink'].forEach(function(k) {
        assert.ok(App.i18n.translations.pl[k], 'pl ' + k);
        assert.ok(App.i18n.translations.en[k], 'en ' + k);
      });
    });

    it('hides court actions and the add-player form in CSS', function() {
      var css = fs.readFileSync(path.resolve(__dirname, '..', 'assets/css/styles.css'), 'utf-8');
      assert.ok(css.includes('body.view-only .board-court-actions'));
      assert.ok(css.includes('body.view-only .add-player-form'));
    });
  });
});
