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

  describe('zoom levels cycling', function() {
    it('should have 4 zoom levels', function() {
      assert.deepStrictEqual(App.UI._zoomLevels, [1, 1.25, 1.5, 2]);
    });

    it('should update button text via _updateZoomButton', function() {
      var btn = document.getElementById('btnZoom');
      localStorage.setItem('badminton_zoom', 1.5);
      App.UI._updateZoomButton(btn);
      assert.strictEqual(btn.textContent, '1.5x');
    });

    it('should show 1x when no zoom set', function() {
      var btn = document.getElementById('btnZoom');
      App.UI._updateZoomButton(btn);
      assert.strictEqual(btn.textContent, '1x');
    });
  });

  describe('i18n keys', function() {
    it('should have zoomTooltip in both languages', function() {
      assert.notStrictEqual(App.i18n.translations.pl.zoomTooltip, undefined);
      assert.notStrictEqual(App.i18n.translations.en.zoomTooltip, undefined);
    });
  });
});
