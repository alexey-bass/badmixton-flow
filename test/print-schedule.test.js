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

  it('should contain all player names', function() {
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

  it('should leave score cell empty for pending games', function() {
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

    // Pending games pre-fill the court column (round-robin) but leave score blank
    assert.ok(html._html.includes('<td class="fill"></td>'), 'should have empty score cell for pending games');
  });

  it('should pre-fill court numbers round-robin for pending games', function() {
    createShuffleSession(8, [1, 2]);
    App.Shuffle.generate(4); // 2 rounds × 2 courts

    var html = '';
    var origOpen = window.open;
    window.open = function() {
      var doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
      html = doc;
      return { document: doc, focus: function() {}, print: function() {} };
    };
    App.UI.printSchedule();
    window.open = origOpen;

    // With 2 courts × 2 rounds, courts should cycle K1,K2,K1,K2 across the four games.
    var courtCells = html._html.match(/<td class="court-cell">([^<]*)<\/td>/g) || [];
    var courts = courtCells.map(function(c) { var m = c.match(/>([^<]*)</); return m ? m[1] : ''; });
    assert.deepStrictEqual(courts, ['K1', 'K2', 'K1', 'K2'], 'courts should cycle round-robin by schedule index');
  });

  it('should honour custom court display numbers when pre-filling', function() {
    createShuffleSession(8, [3, 7]);
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

    var courtCells = html._html.match(/<td class="court-cell">([^<]*)<\/td>/g) || [];
    var courts = courtCells.map(function(c) { var m = c.match(/>([^<]*)</); return m ? m[1] : ''; });
    assert.deepStrictEqual(courts, ['K3', 'K7'], 'should use courts\' display numbers in order');
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

    // Scores are stored in canonical "N-M" form whatever separator was entered
    assert.ok(html._html.includes('21-15'), 'should contain score for finished game');
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

  it('should mark round-cell on rowspanned round column for non-final rounds', function() {
    createShuffleSession(8, [1, 2]);
    App.Shuffle.generate(4); // 2 rounds

    var html = '';
    var origOpen = window.open;
    window.open = function() {
      var doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
      html = doc;
      return { document: doc, focus: function() {}, print: function() {} };
    };
    App.UI.printSchedule();
    window.open = origOpen;

    // Round 1's cell should have round-cell class; round 2 (last) should not.
    var roundCells = html._html.match(/<td[^>]*rowspan="2"[^>]*>\s*R\d+\s*<\/td>/g) || [];
    assert.strictEqual(roundCells.length, 2, 'should have 2 round cells');
    assert.ok(roundCells[0].includes('R1'), 'first round cell should be R1');
    assert.ok(roundCells[1].includes('R2'), 'second round cell should be R2');
    assert.ok(roundCells[0].includes('class="round-cell"'), 'first round cell should have round-cell class');
    assert.ok(!roundCells[1].includes('round-cell'), 'last round cell should not have round-cell class');
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
    assert.ok(html._html.includes('Score'), 'should have Score header');
    assert.ok(html._html.includes('Team A'), 'should have Team A header');
    // English court prefix: C
    assert.ok(/<td class="court-cell">C\d+<\/td>/.test(html._html), 'court cells should use C prefix in English');
    // Round prefix is R in both languages
    assert.ok(/rowspan="2"[^>]*>\s*R\d+\s*<\/td>/.test(html._html), 'round cells should use R prefix in English');

    App.i18n.setLang('pl');
  });
});
