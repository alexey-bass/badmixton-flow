var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

function createShuffleSession(playerCount, courts) {
  App.Session.create('Thursday training', 'shuffle');
  App.Session.initCourts(courts || [1, 2]);

  var ids = [];
  for (var i = 0; i < playerCount; i++) {
    var id = App.Players.add('Player' + (i + 1));
    App.Players.markPresent(id);
    ids.push(id);
  }
  return ids;
}

describe('App.UI.printSchedule', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  it('should not open window when schedule is empty', function() {
    App.Session.create('Test', 'shuffle');
    var opened = false;
    var origOpen = window.open;
    window.open = function() { opened = true; return { document: { _html: '', write: function() {}, close: function() {} }, focus: function() {}, print: function() {} }; };
    App.UI.printSchedule();
    window.open = origOpen;
    assert.strictEqual(opened, false);
  });

  it('should contain session name in output', function() {
    createShuffleSession(6);
    App.Shuffle.generate(2);

    var html = '';
    var origOpen = window.open;
    window.open = function() {
      var doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
      html = doc;
      return { document: doc, focus: function() {}, print: function() {} };
    };
    App.UI.printSchedule();
    window.open = origOpen;

    assert.ok(html._html.includes('Thursday training'), 'should contain session name');
  });

  it('should contain player roster', function() {
    var ids = createShuffleSession(4);
    App.Shuffle.generate(1);

    var html = '';
    var origOpen = window.open;
    window.open = function() {
      var doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
      html = doc;
      return { document: doc, focus: function() {}, print: function() {} };
    };
    App.UI.printSchedule();
    window.open = origOpen;

    // Should contain all player names
    for (var i = 0; i < ids.length; i++) {
      var p = App.state.players[ids[i]];
      assert.ok(html._html.includes(p.name), 'should contain player ' + p.name);
    }
  });

  it('should contain game rows with team names', function() {
    createShuffleSession(6);
    App.Shuffle.generate(2);

    var html = '';
    var origOpen = window.open;
    window.open = function() {
      var doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
      html = doc;
      return { document: doc, focus: function() {}, print: function() {} };
    };
    App.UI.printSchedule();
    window.open = origOpen;

    // Should have table rows for each game
    var trCount = (html._html.match(/<tr>/g) || []).length;
    assert.ok(trCount >= 2, 'should have at least 2 game rows');
  });

  it('should have empty cells for pending games', function() {
    createShuffleSession(6);
    App.Shuffle.generate(2);

    var html = '';
    var origOpen = window.open;
    window.open = function() {
      var doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
      html = doc;
      return { document: doc, focus: function() {}, print: function() {} };
    };
    App.UI.printSchedule();
    window.open = origOpen;

    // Pending games should have empty fill cells for court/score/winner
    assert.ok(html._html.includes('<td class="fill"></td>'), 'should have empty fill cells for pending games');
  });

  it('should pre-fill data for finished games', function() {
    createShuffleSession(4);
    App.Shuffle.generate(1);
    App.Shuffle.autoAssignAll();

    // Find a ready game and play it through
    var entry = App.state.schedule.find(function(e) { return e.status === 'ready'; });
    assert.ok(entry, 'should have a ready game');
    App.Courts.startGame(entry.courtId, entry.teamA, entry.teamB);
    App.Courts.finishGame(entry.courtId, '21:15', 'teamA');

    var html = '';
    var origOpen = window.open;
    window.open = function() {
      var doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
      html = doc;
      return { document: doc, focus: function() {}, print: function() {} };
    };
    App.UI.printSchedule();
    window.open = origOpen;

    assert.ok(html._html.includes('21:15'), 'should contain score for finished game');
  });

  it('should show toast when popup is blocked', function() {
    createShuffleSession(6);
    App.Shuffle.generate(2);

    var origOpen = window.open;
    window.open = function() { return null; };
    // Should not throw
    App.UI.printSchedule();
    window.open = origOpen;
  });

  it('should contain translated headers', function() {
    createShuffleSession(6);
    App.Shuffle.generate(2);

    App.i18n.setLang('en');
    var html = '';
    var origOpen = window.open;
    window.open = function() {
      var doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
      html = doc;
      return { document: doc, focus: function() {}, print: function() {} };
    };
    App.UI.printSchedule();
    window.open = origOpen;

    assert.ok(html._html.includes('Game schedule'), 'should have English title');
    assert.ok(html._html.includes('Player roster'), 'should have English roster heading');
    assert.ok(html._html.includes('Score'), 'should have Score header');
    assert.ok(html._html.includes('Team A'), 'should have Team A header');

    App.i18n.setLang('pl');
  });
});
