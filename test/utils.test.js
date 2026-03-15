var { describe, it } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.Utils', function() {
  describe('generateId', function() {
    it('should generate id with given prefix', function() {
      var id = App.Utils.generateId('p');
      assert.ok(id.startsWith('p_'));
    });

    it('should generate unique ids', function() {
      var id1 = App.Utils.generateId('p');
      var id2 = App.Utils.generateId('p');
      assert.notStrictEqual(id1, id2);
    });
  });

  describe('formatTime', function() {
    it('should format 0ms as 0:00', function() {
      assert.strictEqual(App.Utils.formatTime(0), '0:00');
    });

    it('should format null as 0:00', function() {
      assert.strictEqual(App.Utils.formatTime(null), '0:00');
    });

    it('should format 61 seconds', function() {
      assert.strictEqual(App.Utils.formatTime(61000), '1:01');
    });

    it('should format 5 minutes', function() {
      assert.strictEqual(App.Utils.formatTime(300000), '5:00');
    });
  });

  describe('formatDate', function() {
    it('should format a date as DD.MM.YYYY', function() {
      var result = App.Utils.formatDate(new Date(2026, 2, 10)); // March 10, 2026
      assert.strictEqual(result, '10.03.2026');
    });
  });

  describe('getISODate', function() {
    it('should return YYYY-MM-DD for today', function() {
      var today = new Date();
      var result = App.Utils.getISODate(today);
      assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
      assert.strictEqual(result, today.toISOString().split('T')[0]);
    });
  });

  describe('formatTimestamp', function() {
    it('should return empty string for falsy input', function() {
      assert.strictEqual(App.Utils.formatTimestamp(0), '');
      assert.strictEqual(App.Utils.formatTimestamp(null), '');
    });

    it('should format a timestamp as H:MM', function() {
      var ts = new Date(2026, 2, 10, 14, 5).getTime();
      assert.strictEqual(App.Utils.formatTimestamp(ts), '14:05');
    });
  });

  describe('formatWaitMinutes', function() {
    it('should return "new" for 0ms', function() {
      App.i18n.currentLang = 'en';
      assert.strictEqual(App.Utils.formatWaitMinutes(0), 'new');
    });

    it('should return "new" for null', function() {
      App.i18n.currentLang = 'en';
      assert.strictEqual(App.Utils.formatWaitMinutes(null), 'new');
    });

    it('should return "new" for less than 1 minute', function() {
      App.i18n.currentLang = 'en';
      assert.strictEqual(App.Utils.formatWaitMinutes(59000), 'new');
    });

    it('should return "1 min" for 1 minute', function() {
      App.i18n.currentLang = 'en';
      assert.strictEqual(App.Utils.formatWaitMinutes(60000), '1 min');
    });

    it('should return "5 min" for 5 minutes', function() {
      App.i18n.currentLang = 'en';
      assert.strictEqual(App.Utils.formatWaitMinutes(300000), '5 min');
    });

    it('should return Polish translation', function() {
      App.i18n.currentLang = 'pl';
      assert.strictEqual(App.Utils.formatWaitMinutes(0), 'nowy');
      assert.strictEqual(App.Utils.formatWaitMinutes(120000), '2 min');
    });
  });

  describe('getDeviceInfo', function() {
    it('should return object with browser, os, screen, ts', function() {
      var info = App.Utils.getDeviceInfo();
      assert.strictEqual(typeof info.browser, 'string');
      assert.strictEqual(typeof info.os, 'string');
      assert.strictEqual(typeof info.screen, 'string');
      assert.strictEqual(typeof info.ts, 'number');
      assert.ok(info.ts > 0);
      assert.match(info.screen, /^\d+x\d+$/);
    });
  });
});
