var { describe, it } = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');
var { loadApp } = require('./helpers');

var App = loadApp();

var html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

// Simple helpers to extract ordered elements from HTML
function extractAttr(regex) {
  var results = [];
  var match;
  while ((match = regex.exec(html)) !== null) {
    results.push(match[1]);
  }
  return results;
}

describe('Header buttons order', function() {
  // Extract button IDs from topbar-right section
  var topbarRight = html.match(/<div class="topbar-right">([\s\S]*?)<\/div>\s*<\/header>/);
  var buttonIds = topbarRight ? extractAttr(/id="([^"]+)"/g) : [];
  // Filter to only buttons/elements inside topbar-right
  var topbarHtml = topbarRight ? topbarRight[1] : '';
  var topbarButtonIds = [];
  var idRegex = /id="([^"]+)"/g;
  var m;
  while ((m = idRegex.exec(topbarHtml)) !== null) {
    topbarButtonIds.push(m[1]);
  }

  it('should have lang switcher, wake lock, fullscreen, help, mode toggle, sync indicator', function() {
    assert.deepStrictEqual(topbarButtonIds, [
      'langSwitcher',
      'btnWakeLock',
      'btnFullscreen',
      'btnZoom',
      'btnHelp',
      'btnToggleMode',
      'modeIcon',
      'syncIndicator'
    ]);
  });

  it('should have lock indicator in topbar-left', function() {
    var topbarLeft = html.match(/<div class="topbar-left">([\s\S]*?)<\/div>/);
    assert.ok(topbarLeft, 'topbar-left should exist');
    assert.ok(topbarLeft[1].indexOf('lockIndicator') !== -1, 'lockIndicator should be in topbar-left');
  });

  it('should have wake lock button before fullscreen button', function() {
    var wakeLockIdx = topbarButtonIds.indexOf('btnWakeLock');
    var fullscreenIdx = topbarButtonIds.indexOf('btnFullscreen');
    assert.ok(wakeLockIdx < fullscreenIdx, 'wake lock should come before fullscreen');
  });

  it('should have help button before mode toggle', function() {
    var helpIdx = topbarButtonIds.indexOf('btnHelp');
    var modeIdx = topbarButtonIds.indexOf('btnToggleMode');
    assert.ok(helpIdx < modeIdx, 'help should come before mode toggle');
  });
});

describe('Tab navigation order', function() {
  var navHtml = html.match(/<nav class="tabs"[^>]*>([\s\S]*?)<\/nav>/);
  var tabNames = [];
  if (navHtml) {
    var tabRegex = /data-tab="([^"]+)"/g;
    var m;
    while ((m = tabRegex.exec(navHtml[1])) !== null) {
      tabNames.push(m[1]);
    }
  }

  it('should have correct number of tabs', function() {
    assert.strictEqual(tabNames.length, 8);
  });

  it('should have tabs in correct order', function() {
    assert.deepStrictEqual(tabNames, [
      'board',
      'players',
      'results',
      'courts',
      'queue',
      'history',
      'dashboard',
      'debug'
    ]);
  });

  it('should have board tab active by default', function() {
    assert.ok(html.includes('data-tab="board"') && html.match(/class="tab active"[^>]*data-tab="board"/));
  });
});

describe('Content panels', function() {
  var panelIds = [];
  var panelRegex = /id="(panel-[^"]+)"/g;
  var m;
  while ((m = panelRegex.exec(html)) !== null) {
    panelIds.push(m[1]);
  }

  it('should have a panel for each tab', function() {
    assert.ok(panelIds.includes('panel-board'));
    assert.ok(panelIds.includes('panel-players'));
    assert.ok(panelIds.includes('panel-queue'));
    assert.ok(panelIds.includes('panel-dashboard'));
    assert.ok(panelIds.includes('panel-courts'));
    assert.ok(panelIds.includes('panel-history'));
    assert.ok(panelIds.includes('panel-results'));
    assert.ok(panelIds.includes('panel-debug'));
  });

  it('should have board panel active by default', function() {
    assert.ok(html.match(/class="panel active"[^>]*id="panel-board"/));
  });
});

describe('PWA meta tags', function() {
  it('should have manifest link', function() {
    assert.ok(html.includes('<link rel="manifest" href="manifest.json">'));
  });

  it('should have theme-color meta', function() {
    assert.ok(html.match(/<meta name="theme-color" content="#[0-9a-f]+"/));
  });

  it('should have apple-mobile-web-app-capable', function() {
    assert.ok(html.includes('<meta name="apple-mobile-web-app-capable" content="yes">'));
  });

  it('should have apple-touch-icon', function() {
    assert.ok(html.match(/<link rel="apple-touch-icon" href="[^"]+"/));
  });

  it('should have service worker kill-switch (off by default, opt-in via localStorage)', function() {
    assert.ok(html.includes("badminton_sw"), 'should gate SW registration on localStorage flag');
    assert.ok(html.includes("serviceWorker.register"), 'should still register SW when opted in');
    assert.ok(html.includes("getRegistrations"), 'should unregister any existing SW when opted out');
  });
});

describe('Wake Lock feature', function() {
  it('should have _bindWakeLock method', function() {
    assert.strictEqual(typeof App.UI._bindWakeLock, 'function');
  });

  it('should have _wakeLock property initialized to null', function() {
    assert.strictEqual(App.UI._wakeLock, null);
  });

  it('should have wake lock tooltip translations in both languages', function() {
    App.i18n.currentLang = 'pl';
    assert.ok(App.t('wakeLockTooltip').length > 0, 'Polish translation should exist');
    App.i18n.currentLang = 'en';
    assert.ok(App.t('wakeLockTooltip').length > 0, 'English translation should exist');
  });

  it('should have wake lock button hidden by default in HTML', function() {
    assert.ok(html.match(/id="btnWakeLock"[^>]*hidden/), 'button should be hidden by default');
  });
});

describe('Emoji picker in Players panel', function() {
  it('should have emoji picker element hidden by default', function() {
    assert.ok(html.match(/id="emojiPicker"[^>]*hidden/));
  });

  it('should have emoji hint and chips containers', function() {
    assert.ok(html.includes('id="emojiHint"'));
    assert.ok(html.includes('id="emojiChips"'));
  });

  it('should be positioned after the add-player-form', function() {
    var formIdx = html.indexOf('add-player-form');
    var pickerIdx = html.indexOf('id="emojiPicker"');
    assert.ok(formIdx < pickerIdx, 'emoji picker should come after the form');
  });
});

describe('Bulk add players button', function() {
  it('should have bulk add button in HTML', function() {
    assert.ok(html.includes('id="btnBulkAddPlayers"'), 'bulk add button should exist');
  });

  it('should have _showBulkAddDialog method', function() {
    assert.strictEqual(typeof App.UI._showBulkAddDialog, 'function');
  });

  it('should have bulk add translations in both languages', function() {
    App.i18n.currentLang = 'pl';
    assert.ok(App.t('bulkAddTitle').length > 0);
    assert.ok(App.t('bulkAddHint').length > 0);
    assert.ok(App.t('bulkAddMarkPresent').length > 0);
    App.i18n.currentLang = 'en';
    assert.ok(App.t('bulkAddTitle').length > 0);
    assert.ok(App.t('bulkAddHint').length > 0);
    assert.ok(App.t('bulkAddMarkPresent').length > 0);
  });
});
