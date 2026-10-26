var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();
var TROPHY = '🏆';
var HANDSHAKE = '🤝';

function createShuffle(names) {
  App.Session.create('Test', 'shuffle');
  App.Session.initCourts([1]);
  return names.map(function(n) { var id = App.Players.add(n); App.Players.markPresent(id); return id; });
}

// One scheduled game, started and finished the given way; returns the entry
function playOne(score, winner) {
  App.Shuffle.generateRounds(1);
  App.Shuffle.autoAssignAll();
  var e = App.state.schedule[0];
  App.Courts.startGame(e.courtId, e.teamA, e.teamB);
  App.Courts.finishGame(e.courtId, score, winner);
  return e;
}

function nameOf(pid) { return App.state.players[pid].name; }

function printHtml() {
  var doc = null;
  var origOpen = window.open;
  window.open = function() {
    doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
    return { document: doc, focus: function() {}, print: function() {} };
  };
  App.UI.printSchedule();
  window.open = origOpen;
  return doc._html;
}

describe('Matches.resultOf (#106)', function() {
  it('derives the outcome from score first, then the declared winner', function() {
    var m = { teamA: ['a'], teamB: ['b'] };
    assert.deepStrictEqual(App.Matches.resultOf(Object.assign({}, m, { winner: 'teamB' })), { winnerSide: 'teamB', draw: false, score: null });
    assert.deepStrictEqual(App.Matches.resultOf(Object.assign({}, m, { score: '21-15', winner: 'teamA' })), { winnerSide: 'teamA', draw: false, score: '21-15' });
    assert.deepStrictEqual(App.Matches.resultOf(Object.assign({}, m, { score: '20-20', winner: 'draw' })), { winnerSide: null, draw: true, score: '20-20' });
    assert.deepStrictEqual(App.Matches.resultOf(Object.assign({}, m, { winner: 'draw' })), { winnerSide: null, draw: true, score: null });
    assert.deepStrictEqual(App.Matches.resultOf(m), { winnerSide: null, draw: false, score: null });
  });
});

describe('Schedule tab shows results of finished games (#106)', function() {
  beforeEach(function() { localStorage.clear(); });

  it('marks the winning team when finished with the team-win button and no score', function() {
    createShuffle(['A', 'B', 'C', 'D']);
    var e = playOne(null, 'teamB');
    App.UI._renderScheduleTab();
    var html = document.getElementById('queueList').innerHTML;
    var iA = html.indexOf(nameOf(e.teamA[0]));
    var iB = html.indexOf(nameOf(e.teamB[0]));
    var iT = html.indexOf(TROPHY);
    assert.ok(iT !== -1, 'trophy shown');
    assert.ok(iA < iT && iT < iB, 'trophy sits before team B, after team A');
  });

  it('shows the score and the draw marker when present', function() {
    createShuffle(['A', 'B', 'C', 'D']);
    playOne('21-15');
    App.UI._renderScheduleTab();
    var html = document.getElementById('queueList').innerHTML;
    assert.ok(html.indexOf('21-15') !== -1 && html.indexOf(TROPHY) !== -1);

    localStorage.clear();
    createShuffle(['A', 'B', 'C', 'D']);
    playOne('20-20', 'draw');
    App.UI._renderScheduleTab();
    html = document.getElementById('queueList').innerHTML;
    assert.ok(html.indexOf(HANDSHAKE) !== -1 && html.indexOf(TROPHY) === -1);
  });
});

describe('Print schedule shows the winner without a score (#106)', function() {
  beforeEach(function() { localStorage.clear(); });

  it('marks the winning team cell and leaves the score column blank', function() {
    createShuffle(['A', 'B', 'C', 'D']);
    var e = playOne(null, 'teamA');
    var html = printHtml();
    var cells = html.match(/<td class="winner">[^<]*<\/td>/g) || [];
    assert.strictEqual(cells.length, 1, 'exactly one winner cell');
    assert.ok(cells[0].indexOf('✓ ') !== -1 && cells[0].indexOf(nameOf(e.teamA[0])) !== -1);
    assert.ok(/<td class="fill"><\/td>/.test(html), 'score column stays blank for handwriting');
  });

  it('shows the draw label when a draw was declared without a score', function() {
    createShuffle(['A', 'B', 'C', 'D']);
    playOne(null, 'draw');
    var html = printHtml();
    assert.ok(html.indexOf('<td class="fill">' + App.t('printDraw') + '</td>') !== -1);
    assert.ok(html.indexOf('class="winner"') === -1);
    assert.ok(App.i18n.translations.pl.printDraw && App.i18n.translations.en.printDraw);
  });
});

describe('Win streak counts declared winners (#106)', function() {
  it('builds a streak from matches finished with the team-win button', function() {
    localStorage.clear();
    App.Session.create('Test', 'queue');
    App.Session.initCourts([1]);
    var ids = ['A', 'B', 'C', 'D'].map(function(n) { var id = App.Players.add(n); App.Players.markPresent(id); return id; });
    var t = 1000;
    [[ids[0], ids[1], ids[2], ids[3]], [ids[0], ids[2], ids[1], ids[3]], [ids[0], ids[3], ids[1], ids[2]]].forEach(function(g, i) {
      var id = 'm' + i;
      App.state.matches[id] = { id: id, status: 'finished', startTime: t, endTime: t + 1, courtId: 'c_1', teamA: [g[0], g[1]], teamB: [g[2], g[3]], score: null, winner: 'teamA' };
      t += 1000;
    });
    ids.forEach(function(pid) { App.state.players[pid].gamesPlayed = 3; });
    var h = App.UI._buildHighlights(Object.values(App.state.players)).find(function(x) { return x.icon === '🔥'; });
    assert.ok(h, 'win streak highlight present');
    assert.ok(h.value.indexOf('3') !== -1 && h.value.indexOf('A') !== -1, 'A on a 3-game streak');
  });
});
