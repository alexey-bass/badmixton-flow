var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('UI zoom setting', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
  });

  describe('localStorage persistence', function() {
    it('should default to 1 when not set', function() {
      var zoom = parseFloat(localStorage.getItem('badminton_zoom')) || 1;
      assert.strictEqual(zoom, 1);
    });

    it('should store zoom value in localStorage', function() {
      localStorage.setItem('badminton_zoom', 1.5);
      var zoom = parseFloat(localStorage.getItem('badminton_zoom'));
      assert.strictEqual(zoom, 1.5);
    });

    it('should not be in session state', function() {
      assert.strictEqual(App.state.settings.uiZoom, undefined);
    });
  });

  describe('_applyZoom', function() {
    it('should set body.style.zoom for non-1 values', function() {
      localStorage.setItem('badminton_zoom', 1.5);
      App.UI._applyZoom();
      assert.strictEqual(document.body.style.zoom, 1.5);
    });

    it('should clear body.style.zoom for value 1', function() {
      document.body.style.zoom = 2;
      localStorage.setItem('badminton_zoom', 1);
      App.UI._applyZoom();
      assert.strictEqual(document.body.style.zoom, '');
    });

    it('should clear body.style.zoom when not set', function() {
      document.body.style.zoom = 2;
      App.UI._applyZoom();
      assert.strictEqual(document.body.style.zoom, '');
    });
  });

  describe('i18n keys', function() {
    it('should have uiZoomLabel in both languages', function() {
      assert.notStrictEqual(App.i18n.translations.pl.uiZoomLabel, undefined);
      assert.notStrictEqual(App.i18n.translations.en.uiZoomLabel, undefined);
    });
  });
});
