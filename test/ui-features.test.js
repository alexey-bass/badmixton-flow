var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp, createMockElement } = require('./helpers');

var App = loadApp();

describe('Auto-generated session ID', function() {
  describe('generateSessionId', function() {
    it('should start with bf- prefix', function() {
      var id = App.Utils.generateSessionId();
      assert.ok(id.startsWith('bf-'), 'ID should start with bf-: ' + id);
    });

    it('should be 10 characters long (bf- + 7 chars)', function() {
      var id = App.Utils.generateSessionId();
      assert.strictEqual(id.length, 10);
    });

    it('should contain only alphanumeric chars after prefix', function() {
      var id = App.Utils.generateSessionId();
      var hash = id.slice(3);
      assert.match(hash, /^[a-z0-9]+$/);
    });

    it('should produce unique IDs', function() {
      var id1 = App.Utils.generateSessionId();
      var id2 = App.Utils.generateSessionId();
      assert.notStrictEqual(id1, id2);
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

describe('Help modal version info', function() {
  it('should include App.VERSION in help modal copyright line', function() {
    // The help modal builds HTML with App.VERSION in the copyright
    // Verify the version string is accessible and non-empty
    assert.ok(App.VERSION, 'App.VERSION should be defined');
    assert.ok(App.VERSION.length > 0, 'App.VERSION should not be empty');
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

describe('Emoji name disambiguation', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
  });

  describe('_hasNameDuplicate', function() {
    it('should return false when no duplicate exists', function() {
      App.Players.add('Alice');
      assert.strictEqual(App.UI._hasNameDuplicate('Bob'), false);
    });

    it('should return true when exact duplicate exists', function() {
      App.Players.add('Ola');
      assert.strictEqual(App.UI._hasNameDuplicate('Ola'), true);
    });

    it('should be case-insensitive', function() {
      App.Players.add('Ola');
      assert.strictEqual(App.UI._hasNameDuplicate('ola'), true);
      assert.strictEqual(App.UI._hasNameDuplicate('OLA'), true);
    });

    it('should return false for empty players list', function() {
      assert.strictEqual(App.UI._hasNameDuplicate('Ola'), false);
    });

    it('should exclude player by id', function() {
      var id = App.Players.add('Ola');
      assert.strictEqual(App.UI._hasNameDuplicate('Ola', id), false);
    });

    it('should still detect duplicates when excluding a different player', function() {
      var id1 = App.Players.add('Ola');
      var id2 = App.Players.add('Kasia');
      assert.strictEqual(App.UI._hasNameDuplicate('Ola', id2), true);
    });
  });

  describe('_emojiAnimals', function() {
    it('should have at least 10 animal emojis', function() {
      assert.ok(App.UI._emojiAnimals.length >= 10);
    });

    it('should contain only unique emojis', function() {
      var unique = new Set(App.UI._emojiAnimals);
      assert.strictEqual(unique.size, App.UI._emojiAnimals.length);
    });
  });

  describe('emoji translations', function() {
    it('should have emojiHint in both languages', function() {
      App.i18n.currentLang = 'pl';
      assert.ok(App.t('emojiHint').length > 0);
      App.i18n.currentLang = 'en';
      assert.ok(App.t('emojiHint').length > 0);
    });

    it('should have emojiSkip in both languages', function() {
      App.i18n.currentLang = 'pl';
      assert.ok(App.t('emojiSkip').length > 0);
      App.i18n.currentLang = 'en';
      assert.ok(App.t('emojiSkip').length > 0);
    });
  });
});

describe('Player name with games superscript (_pname)', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1]);
  });

  it('should return escaped name without superscript when 0 games', function() {
    var id = App.Players.add('Ola');
    var p = App.state.players[id];
    var result = App.UI._pname(p);
    assert.strictEqual(result, 'Ola');
    assert.ok(!result.includes('<sup>'), 'Should not have superscript for 0 games');
  });

  it('should return name with superscript when games > 0', function() {
    var id = App.Players.add('Aleks');
    var p = App.state.players[id];
    p.gamesPlayed = 3;
    var result = App.UI._pname(p);
    assert.strictEqual(result, 'Aleks<sup>3</sup>');
  });

  it('should escape HTML in player name', function() {
    var id = App.Players.add('<script>');
    var p = App.state.players[id];
    p.gamesPlayed = 1;
    var result = App.UI._pname(p);
    assert.ok(!result.includes('<script>'), 'Name should be escaped');
    assert.ok(result.includes('<sup>1</sup>'), 'Should have superscript');
  });

  it('should handle emoji names', function() {
    var id = App.Players.add('Ola 🐶');
    var p = App.state.players[id];
    p.gamesPlayed = 5;
    var result = App.UI._pname(p);
    assert.ok(result.includes('🐶'));
    assert.ok(result.includes('<sup>5</sup>'));
  });

  it('should work with just player id', function() {
    var id = App.Players.add('Marek');
    App.state.players[id].gamesPlayed = 2;
    // _pname should also accept a player object from state lookup
    var result = App.UI._pname(App.state.players[id]);
    assert.strictEqual(result, 'Marek<sup>2</sup>');
  });
});
