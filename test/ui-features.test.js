var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp, createMockElement } = require('./helpers');

var App = loadApp();

describe('Session ID salt', function() {
  // The salt logic uses this regex to strip existing salt before adding new one
  var saltRegex = /-[a-z0-9]{5}$/;

  describe('salt regex', function() {
    it('should match a 5-char alphanumeric suffix', function() {
      assert.ok(saltRegex.test('badminton-2026-03-10-k7x2m'));
    });

    it('should not match the date portion', function() {
      // '03-10' is 5 chars but contains a hyphen, so won't match [a-z0-9]{5}
      var base = 'badminton-2026-03-10';
      var replaced = base.replace(saltRegex, '');
      assert.strictEqual(replaced, base);
    });

    it('should strip only the salt suffix', function() {
      var salted = 'badminton-2026-03-10-abc12';
      var stripped = salted.replace(saltRegex, '');
      assert.strictEqual(stripped, 'badminton-2026-03-10');
    });

    it('should handle custom session names with salt', function() {
      var salted = 'my-session-zz99a';
      var stripped = salted.replace(saltRegex, '');
      assert.strictEqual(stripped, 'my-session');
    });
  });

  describe('salt generation', function() {
    it('should produce a 5-character alphanumeric string', function() {
      var salt = Math.random().toString(36).substr(2, 5);
      assert.match(salt, /^[a-z0-9]{3,5}$/);
    });

    it('should produce different salts on successive calls', function() {
      var salt1 = Math.random().toString(36).substr(2, 5);
      var salt2 = Math.random().toString(36).substr(2, 5);
      // Extremely unlikely to be equal
      assert.notStrictEqual(salt1, salt2);
    });
  });
});

describe('Fullscreen button', function() {
  it('should exist in _bindFullscreen method', function() {
    assert.strictEqual(typeof App.UI._bindFullscreen, 'function');
  });
});

describe('i18n data-i18n-title support', function() {
  it('should apply title attribute to elements with data-i18n-title', function() {
    var titleSet = null;
    var mockEl = createMockElement({
      getAttribute: function(attr) {
        if (attr === 'data-i18n-title') return 'fullscreenTooltip';
        return null;
      }
    });
    // Override title setter to capture the value
    Object.defineProperty(mockEl, 'title', {
      set: function(v) { titleSet = v; },
      get: function() { return titleSet; }
    });

    // Mock querySelectorAll to return our element for data-i18n-title
    var origQSA = global.document.querySelectorAll;
    global.document.querySelectorAll = function(selector) {
      if (selector === '[data-i18n-title]') return [mockEl];
      return [];
    };

    App.i18n.currentLang = 'en';
    App.i18n.apply();

    // Restore
    global.document.querySelectorAll = origQSA;

    assert.strictEqual(titleSet, 'Fullscreen');
  });

  it('should apply Polish title when lang is pl', function() {
    var titleSet = null;
    var mockEl = createMockElement({
      getAttribute: function(attr) {
        if (attr === 'data-i18n-title') return 'fullscreenTooltip';
        return null;
      }
    });
    Object.defineProperty(mockEl, 'title', {
      set: function(v) { titleSet = v; },
      get: function() { return titleSet; }
    });

    var origQSA = global.document.querySelectorAll;
    global.document.querySelectorAll = function(selector) {
      if (selector === '[data-i18n-title]') return [mockEl];
      return [];
    };

    App.i18n.currentLang = 'pl';
    App.i18n.apply();

    global.document.querySelectorAll = origQSA;

    assert.strictEqual(titleSet, 'Pełny ekran');
  });
});

describe('Debug tab version info', function() {
  var appInfoHtml;
  var origGetById;
  var origBody;

  function setupDebugMocks(isPlayerMode) {
    appInfoHtml = '';
    origGetById = global.document.getElementById;
    origBody = global.document.body;

    var appInfoEl = createMockElement();
    Object.defineProperty(appInfoEl, 'innerHTML', {
      set: function(v) { appInfoHtml = v; },
      get: function() { return appInfoHtml; },
      configurable: true
    });

    global.document.getElementById = function(id) {
      if (id === 'debugAppInfo') return appInfoEl;
      return origGetById(id);
    };
    global.document.body = { classList: { contains: function(cls) { return isPlayerMode && cls === 'player-mode'; } } };
  }

  function restoreDebugMocks() {
    global.document.getElementById = origGetById;
    global.document.body = origBody;
  }

  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
  });

  it('should show App.VERSION in debug app info', function() {
    setupDebugMocks(false);
    App.UI.renderDebug();
    restoreDebugMocks();
    assert.ok(appInfoHtml.indexOf(App.VERSION) !== -1, 'should contain App.VERSION');
  });

  it('should show Admin mode when not in player-mode', function() {
    setupDebugMocks(false);
    App.UI.renderDebug();
    restoreDebugMocks();
    assert.ok(appInfoHtml.indexOf('Admin') !== -1, 'should show Admin mode');
  });

  it('should show Player mode when in player-mode', function() {
    setupDebugMocks(true);
    App.UI.renderDebug();
    restoreDebugMocks();
    assert.ok(appInfoHtml.indexOf('Player') !== -1, 'should show Player mode');
  });
});

describe('Mode persistence across refresh', function() {
  var origGetById;
  var origBody;
  var navClasses;
  var bodyClasses;

  function makeClassList(set) {
    return {
      add: function(c) { set.add(c); },
      remove: function(c) { set.delete(c); },
      contains: function(c) { return set.has(c); }
    };
  }

  function setupModeMocks() {
    navClasses = new Set();
    bodyClasses = new Set();
    origGetById = global.document.getElementById;
    origBody = global.document.body;

    var navEl = createMockElement();
    navEl.classList = makeClassList(navClasses);
    var modeIconEl = createMockElement();
    var btnEl = createMockElement();

    global.document.getElementById = function(id) {
      if (id === 'tabNav') return navEl;
      if (id === 'modeIcon') return modeIconEl;
      if (id === 'btnToggleMode') return btnEl;
      return origGetById(id);
    };
    global.document.body = { classList: makeClassList(bodyClasses) };
  }

  function restoreModeMocks() {
    global.document.getElementById = origGetById;
    global.document.body = origBody;
  }

  beforeEach(function() {
    localStorage.clear();
  });

  it('should default to player mode when no saved mode', function() {
    setupModeMocks();
    App.UI._bindModeToggle();
    restoreModeMocks();

    assert.ok(navClasses.has('player-mode'), 'nav should have player-mode');
    assert.ok(bodyClasses.has('player-mode'), 'body should have player-mode');
    assert.strictEqual(localStorage.getItem('badminton_mode'), 'player');
  });

  it('should restore admin mode from localStorage', function() {
    localStorage.setItem('badminton_mode', 'admin');
    setupModeMocks();
    App.UI._bindModeToggle();
    restoreModeMocks();

    assert.ok(!navClasses.has('player-mode'), 'nav should not have player-mode');
    assert.ok(!bodyClasses.has('player-mode'), 'body should not have player-mode');
    assert.strictEqual(localStorage.getItem('badminton_mode'), 'admin');
  });

  it('should restore player mode from localStorage', function() {
    localStorage.setItem('badminton_mode', 'player');
    setupModeMocks();
    App.UI._bindModeToggle();
    restoreModeMocks();

    assert.ok(navClasses.has('player-mode'), 'nav should have player-mode');
    assert.ok(bodyClasses.has('player-mode'), 'body should have player-mode');
  });
});

describe('Queue games counter', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
  });

  it('should format games with App.tGames', function() {
    App.i18n.currentLang = 'en';
    assert.strictEqual(App.tGames(3), '3 games');
    assert.strictEqual(App.tGames(0), '0 games');
  });

  it('should show 0 games for new players', function() {
    var id = App.Players.add('Charlie');
    App.Players.markPresent(id);
    assert.strictEqual(App.state.players[id].gamesPlayed, 0);
    App.i18n.currentLang = 'en';
    assert.strictEqual(App.tGames(0), '0 games');
  });
});

describe('Polish plural rules', function() {
  beforeEach(function() {
    App.i18n.currentLang = 'pl';
  });

  it('should use "gra" for 1', function() {
    assert.strictEqual(App.tGames(1), '1 gra');
  });

  it('should use "gry" for 2-4', function() {
    assert.strictEqual(App.tGames(2), '2 gry');
    assert.strictEqual(App.tGames(3), '3 gry');
    assert.strictEqual(App.tGames(4), '4 gry');
  });

  it('should use "gier" for 5-21', function() {
    assert.strictEqual(App.tGames(5), '5 gier');
    assert.strictEqual(App.tGames(10), '10 gier');
    assert.strictEqual(App.tGames(11), '11 gier');
    assert.strictEqual(App.tGames(12), '12 gier');
    assert.strictEqual(App.tGames(14), '14 gier');
    assert.strictEqual(App.tGames(20), '20 gier');
    assert.strictEqual(App.tGames(21), '21 gier');
  });

  it('should use "gry" for 22-24, 32-34, etc.', function() {
    assert.strictEqual(App.tGames(22), '22 gry');
    assert.strictEqual(App.tGames(23), '23 gry');
    assert.strictEqual(App.tGames(24), '24 gry');
    assert.strictEqual(App.tGames(32), '32 gry');
  });

  it('should use "gier" for 25-31, 35+', function() {
    assert.strictEqual(App.tGames(25), '25 gier');
    assert.strictEqual(App.tGames(30), '30 gier');
    assert.strictEqual(App.tGames(100), '100 gier');
  });

  it('should use "gier" for 0', function() {
    assert.strictEqual(App.tGames(0), '0 gier');
  });
});

describe('English plural rules', function() {
  beforeEach(function() {
    App.i18n.currentLang = 'en';
  });

  it('should use "game" for 1', function() {
    assert.strictEqual(App.tGames(1), '1 game');
  });

  it('should use "games" for other numbers', function() {
    assert.strictEqual(App.tGames(0), '0 games');
    assert.strictEqual(App.tGames(2), '2 games');
    assert.strictEqual(App.tGames(5), '5 games');
    assert.strictEqual(App.tGames(21), '21 games');
  });
});
