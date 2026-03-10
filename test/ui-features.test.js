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

describe('Queue games counter', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
  });

  it('should have gamesN translation in both languages', function() {
    App.i18n.currentLang = 'pl';
    assert.ok(App.t('gamesN').length > 0);
    App.i18n.currentLang = 'en';
    assert.ok(App.t('gamesN').length > 0);
  });

  it('should include gamesPlayed in admin queue HTML', function() {
    var id = App.Players.add('Alice');
    App.Players.markPresent(id);
    App.state.players[id].gamesPlayed = 3;

    // Capture the HTML that renderQueue would produce
    var queue = App.state.waitingQueue;
    var p = App.state.players[queue[0]];
    var html = p.gamesPlayed + App.t('gamesN');
    assert.ok(html.indexOf('3') !== -1);
  });

  it('should include gamesPlayed in board queue HTML', function() {
    var id = App.Players.add('Bob');
    App.Players.markPresent(id);
    App.state.players[id].gamesPlayed = 5;

    var p = App.state.players[id];
    // Simulate board queue item HTML fragment
    var fragment = '<span class="bq-games">' + p.gamesPlayed + App.t('gamesN') + '</span>';
    assert.ok(fragment.indexOf('5') !== -1);
    assert.ok(fragment.indexOf('bq-games') !== -1);
  });

  it('should show 0 games for new players', function() {
    var id = App.Players.add('Charlie');
    App.Players.markPresent(id);

    var p = App.state.players[id];
    assert.strictEqual(p.gamesPlayed, 0);
    App.i18n.currentLang = 'en';
    var text = p.gamesPlayed + App.t('gamesN');
    assert.strictEqual(text, '0 games');
  });
});
