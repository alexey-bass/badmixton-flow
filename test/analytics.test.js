var { describe, it, afterEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.Analytics', function() {
  afterEach(function() {
    delete global.gtag;
  });

  describe('track', function() {
    it('should call gtag when available', function() {
      var calls = [];
      global.gtag = function(type, event, params) {
        calls.push({ type: type, event: event, params: params });
      };

      App.Analytics.track('test_event', { label: 'test' });

      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].type, 'event');
      assert.strictEqual(calls[0].event, 'test_event');
      assert.deepStrictEqual(calls[0].params, { label: 'test' });
    });

    it('should pass empty object as default params', function() {
      var calls = [];
      global.gtag = function(type, event, params) {
        calls.push({ params: params });
      };

      App.Analytics.track('test_event');
      assert.deepStrictEqual(calls[0].params, {});
    });

    it('should not throw when gtag is not available', function() {
      delete global.gtag;
      assert.doesNotThrow(function() {
        App.Analytics.track('test_event');
      });
    });
  });
});
