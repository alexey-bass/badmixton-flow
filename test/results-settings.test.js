var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('Results settings', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1, 2]);
  });

  describe('state defaults', function() {
    it('should have showResults: true in new session', function() {
      assert.strictEqual(App.state.settings.showResults, true);
    });

    it('should have resultsLimit: null in new session', function() {
      assert.strictEqual(App.state.settings.resultsLimit, null);
    });
  });

  describe('state migration', function() {
    it('should add showResults: true when missing', function() {
      var state = { players: {}, settings: {} };
      var result = App.Storage._ensureState(state);
      assert.strictEqual(result.settings.showResults, true);
    });

    it('should add resultsLimit: null when missing', function() {
      var state = { players: {}, settings: {} };
      var result = App.Storage._ensureState(state);
      assert.strictEqual(result.settings.resultsLimit, null);
    });

    it('should preserve existing showResults: false', function() {
      var state = { players: {}, settings: { showResults: false } };
      var result = App.Storage._ensureState(state);
      assert.strictEqual(result.settings.showResults, false);
    });

    it('should preserve existing resultsLimit: 5', function() {
      var state = { players: {}, settings: { resultsLimit: 5 } };
      var result = App.Storage._ensureState(state);
      assert.strictEqual(result.settings.resultsLimit, 5);
    });
  });

  describe('resultsLimit in renderResults', function() {
    function addPlayersWithGames(count) {
      for (var i = 0; i < count; i++) {
        var id = App.Players.add('Player' + (i + 1));
        App.state.players[id].gamesPlayed = 1;
        App.state.players[id].wins = 1;
      }
    }

    function countResultRows() {
      var container = document.getElementById('resultsContent');
      var html = container.innerHTML || '';
      // Count <tr> tags inside tbody (each player row has data-player-id)
      var matches = html.match(/data-player-id="/g);
      return matches ? matches.length : 0;
    }

    it('should show all players when resultsLimit is null', function() {
      addPlayersWithGames(8);
      App.state.settings.resultsLimit = null;
      App.UI.renderResults();
      assert.strictEqual(countResultRows(), 8);
    });

    it('should limit to top 3 when resultsLimit is 3', function() {
      addPlayersWithGames(8);
      App.state.settings.resultsLimit = 3;
      App.UI.renderResults();
      assert.strictEqual(countResultRows(), 3);
    });

    it('should limit to top 5 when resultsLimit is 5', function() {
      addPlayersWithGames(8);
      App.state.settings.resultsLimit = 5;
      App.UI.renderResults();
      assert.strictEqual(countResultRows(), 5);
    });

    it('should limit to top 10 when resultsLimit is 10', function() {
      addPlayersWithGames(12);
      App.state.settings.resultsLimit = 10;
      App.UI.renderResults();
      assert.strictEqual(countResultRows(), 10);
    });

    it('should show all when limit exceeds player count', function() {
      addPlayersWithGames(2);
      App.state.settings.resultsLimit = 5;
      App.UI.renderResults();
      assert.strictEqual(countResultRows(), 2);
    });
  });

  describe('i18n keys', function() {
    it('should have results settings translations in both languages', function() {
      var keys = ['resultsSettings', 'showResultsLabel', 'resultsLimitLabel',
                  'resultsLimitFull', 'resultsLimitTop3', 'resultsLimitTop5', 'resultsLimitTop10'];
      keys.forEach(function(key) {
        assert.notStrictEqual(App.i18n.translations.pl[key], undefined, 'Missing PL: ' + key);
        assert.notStrictEqual(App.i18n.translations.en[key], undefined, 'Missing EN: ' + key);
      });
    });
  });
});
