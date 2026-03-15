// Browser API mocks for Node.js testing
var vm = require('vm');
var fs = require('fs');
var path = require('path');

function createMockElement(overrides) {
  return Object.assign({
    addEventListener: function() {},
    removeEventListener: function() {},
    classList: {
      add: function() {},
      remove: function() {},
      toggle: function() {},
      contains: function() { return false; }
    },
    dataset: {},
    hidden: false,
    innerHTML: '',
    textContent: '',
    className: '',
    value: '',
    placeholder: '',
    style: {},
    querySelectorAll: function() { return []; },
    closest: function() { return null; },
    getAttribute: function() { return null; },
    setAttribute: function() {},
    appendChild: function() {},
    removeChild: function() {},
    remove: function() {},
    focus: function() {}
  }, overrides);
}

function setupBrowserMocks() {
  global.localStorage = {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; },
    clear: function() { this._data = {}; },
    get length() { return Object.keys(this._data).length; },
    key: function(i) { return Object.keys(this._data)[i] || null; }
  };

  var elementCache = {};
  var mockBody = createMockElement();
  global.document = {
    body: mockBody,
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    getElementById: function(id) {
      if (!elementCache[id]) {
        elementCache[id] = createMockElement();
      }
      return elementCache[id];
    },
    createElement: function(tag) {
      return createMockElement({ tagName: tag, children: [] });
    },
    addEventListener: function() {},
    _clearElementCache: function() { elementCache = {}; }
  };

  global.window = {
    location: { search: '', href: 'http://localhost:8080/' }
  };

  global.screen = { width: 1024, height: 768 };

  global.URLSearchParams = require('url').URLSearchParams;
  global.URL = require('url').URL;
  global.Blob = function() {};

  localStorage.clear();
}

// Singleton — load once, reuse across all test files
var _app = null;

function loadApp() {
  if (_app) return _app;

  setupBrowserMocks();

  var dir = path.resolve(__dirname, '..');

  // Firebase config (inlined, same as index.html)
  global.FIREBASE_CONFIG = { apiKey: 'test', databaseURL: 'https://test.firebaseio.com', projectId: 'test' };

  var i18nSrc = fs.readFileSync(dir + '/assets/js/i18n.js', 'utf8');
  var appSrc = fs.readFileSync(dir + '/assets/js/app.js', 'utf8');

  // Remove DOMContentLoaded listener
  appSrc = appSrc.replace(/document\.addEventListener\('DOMContentLoaded'.*\);/, '');
  vm.runInThisContext(i18nSrc, { filename: 'i18n.js' });
  vm.runInThisContext(appSrc, { filename: 'app.js' });

  _app = global.App;
  return _app;
}

module.exports = { setupBrowserMocks, createMockElement, loadApp };
