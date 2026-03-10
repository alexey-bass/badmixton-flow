var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.i18n', function() {
  beforeEach(function() {
    App.i18n.currentLang = 'pl';
  });

  describe('t (translate)', function() {
    it('should return Polish translation by default', function() {
      assert.strictEqual(App.t('tabBoard'), 'Tablica');
    });

    it('should return English translation when lang is en', function() {
      App.i18n.currentLang = 'en';
      assert.strictEqual(App.t('tabBoard'), 'Board');
    });

    it('should return the key if translation not found', function() {
      assert.strictEqual(App.t('nonExistentKey'), 'nonExistentKey');
    });
  });

  describe('translations completeness', function() {
    it('should have same keys in both languages', function() {
      var plKeys = Object.keys(App.i18n.translations.pl).sort();
      var enKeys = Object.keys(App.i18n.translations.en).sort();

      var missingInEn = plKeys.filter(function(k) { return enKeys.indexOf(k) === -1; });
      var missingInPl = enKeys.filter(function(k) { return plKeys.indexOf(k) === -1; });

      assert.deepStrictEqual(missingInEn, [], 'Keys missing in English: ' + missingInEn.join(', '));
      assert.deepStrictEqual(missingInPl, [], 'Keys missing in Polish: ' + missingInPl.join(', '));
    });
  });

  describe('App.t shortcut', function() {
    it('should work the same as App.i18n.t', function() {
      assert.strictEqual(App.t('tabBoard'), App.i18n.t('tabBoard'));
    });
  });
});
