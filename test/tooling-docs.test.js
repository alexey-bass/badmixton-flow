var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');
var { loadApp } = require('./helpers');

var App = loadApp();
var dir = path.resolve(__dirname, '..');

describe('Lighthouse score gate (#95)', function() {
  var checkScores = require('../scripts/lighthouse.js').checkScores;

  it('reports every category below the minimum', function() {
    var categories = {
      performance: { title: 'Performance', score: 0.85 },
      accessibility: { title: 'Accessibility', score: 1 },
      'best-practices': { title: 'Best Practices', score: 0.996 },
      seo: { title: 'SEO', score: 0.99 }
    };
    var below = checkScores(categories, 100);
    assert.deepStrictEqual(below.map(function(c) { return c.title + ' ' + c.score; }), ['Performance 85', 'SEO 99']);
  });

  it('passes when all categories reach the minimum', function() {
    var categories = { performance: { title: 'Performance', score: 1 }, seo: { title: 'SEO', score: 0.995 } };
    assert.deepStrictEqual(checkScores(categories, 100), []);
    assert.deepStrictEqual(checkScores({ seo: { title: 'SEO', score: 0.9 } }, 90), []);
  });
});

describe('Local save failure is surfaced (#99)', function() {
  var origSetItem;
  beforeEach(function() {
    localStorage.clear();
    App.Storage.lastSaveError = null;
    App.Storage._saveErrorToasted = false;
    App.Session.create('Test', 'queue');
    App.Session.initCourts([1]);
    origSetItem = localStorage.setItem;
  });

  // Fail the first `times` writes of the session entry; pass everything else through
  function failingSetItem(times) {
    var calls = 0;
    return function(k, v) {
      if (k.indexOf('bs_') === 0 && k !== 'bs_last' && k !== 'bs_index') {
        if (calls++ < times) { var e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      }
      return origSetItem.call(localStorage, k, v);
    };
  }

  it('toasts once per failure streak, records the error, and clears it after a good save', function() {
    var toasts = [];
    var orig = App.UI.showToast;
    App.UI.showToast = function(m) { toasts.push(m); };
    localStorage.setItem = failingSetItem(99);

    App.Storage.save();
    App.Storage.save();
    assert.deepStrictEqual(toasts, [App.t('saveFailed')], 'one toast for two failed saves');
    assert.ok(App.Storage.lastSaveError && App.Storage.lastSaveError.message.indexOf('Quota') !== -1);

    localStorage.setItem = origSetItem;
    App.Storage.save();
    assert.strictEqual(App.Storage.lastSaveError, null, 'cleared after a successful save');
    assert.strictEqual(App.Storage._saveErrorToasted, false, 'a new streak may toast again');
    App.UI.showToast = orig;
  });

  it('prunes old sessions and retries before giving up', function() {
    var toasts = [];
    var orig = App.UI.showToast;
    App.UI.showToast = function(m) { toasts.push(m); };
    var pruned = 0;
    var origPrune = App.Storage.pruneOldSessions;
    App.Storage.pruneOldSessions = function(days) { pruned++; assert.strictEqual(days, 7); return origPrune.call(App.Storage, days); };
    localStorage.setItem = failingSetItem(1); // first write fails, retry succeeds

    App.Storage.save();
    assert.strictEqual(pruned, 1, 'pruned once');
    assert.deepStrictEqual(toasts, [], 'no toast when the retry succeeded');
    assert.strictEqual(App.Storage.lastSaveError, null);
    assert.ok(localStorage.getItem('bs_' + App.state.sessionId), 'state was saved by the retry');

    localStorage.setItem = origSetItem;
    App.Storage.pruneOldSessions = origPrune;
    App.UI.showToast = orig;
  });

  it('shows the last save error on the Debug tab', function() {
    App.Storage.lastSaveError = { time: Date.now(), message: 'QuotaExceededError' };
    App.UI.renderDebug();
    var html = document.getElementById('debugStorageInfo').innerHTML;
    assert.ok(html.indexOf(App.t('debugLastSaveError')) !== -1);
    assert.ok(html.indexOf('QuotaExceededError') !== -1);
    assert.ok(App.i18n.translations.pl.saveFailed && App.i18n.translations.en.saveFailed);
  });
});

describe('Docs tab count matches the app (#100)', function() {
  it('index.html has 8 panels and the docs say 8', function() {
    var html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    var panels = (html.match(/<section class="panel/g) || []).length;
    assert.strictEqual(panels, 8);
    var claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
    var readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
    assert.ok(claude.indexOf('## Tabs (8 total)') !== -1);
    assert.ok(claude.indexOf('10 tab') === -1, 'CLAUDE.md no longer says 10 tabs');
    assert.ok(readme.indexOf('10 tab') === -1, 'README no longer says 10 tabs');
  });
});
