var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

// The DOM mock has no cloneNode/parentNode, so replace showModal's
// clone-and-swap with a plain innerHTML write; modal HTML stays inspectable.
App.UI.showModal = function(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').hidden = false;
  this._customSwapTarget = null;
};

// Record listeners added to a mocked element so tests can fire them.
function listeners(id) {
  var el = document.getElementById(id);
  var fns = [];
  el.addEventListener = function(type, fn) { fns.push(fn); };
  return fns;
}

function fakeEl(extra) {
  return Object.assign({
    dataset: {},
    classList: { add: function() {}, remove: function() {}, contains: function() { return false; } }
  }, extra);
}

// A click whose target.closest(selector) resolves through `map`.
function click(map) {
  return { target: { closest: function(sel) { return map[sel] || null; } } };
}

function createSession(mode, names) {
  App.Session.create('Test', mode);
  App.Session.initCourts([1, 2]);
  return names.map(function(name) {
    var id = App.Players.add(name);
    App.Players.markPresent(id);
    return id;
  });
}

function selectPlayers(gridHandler, ids) {
  ids.forEach(function(pid) {
    gridHandler(click({ '.player-select-item': fakeEl({ dataset: { pid: pid } }) }));
  });
}

var EVIL = '<img src=x onerror=alert(1)>';

describe('Manual player-select modal (#62, #80)', function() {
  beforeEach(function() {
    localStorage.clear();
    // _syncCustomSplit looks up team/bench containers inside the custom area
    document.getElementById('customSplitArea').querySelector = function() {
      return fakeEl({ innerHTML: '', style: {} });
    };
  });

  it('Start button starts the game with the suggested split', function() {
    var ids = createSession('queue', ['A', 'B', 'C', 'D', 'E', 'F']);
    var grid = listeners('playerSelectGrid');
    var start = listeners('btnStartManual');
    var preview = listeners('selectedTeamsPreview');

    App.UI._showPlayerSelectForCourt('c_1');
    selectPlayers(grid[0], ids.slice(0, 4));

    assert.strictEqual(preview.length, 1, 'preview listener is bound once, not once per selection');
    assert.doesNotThrow(function() { start[0](); });

    var court = App.state.courts.c_1;
    assert.strictEqual(court.occupied, true, 'game started');
    var match = App.state.matches[court.currentMatch];
    assert.deepStrictEqual(match.teamA.concat(match.teamB).sort(), ids.slice(0, 4).sort());
  });

  it('custom split: one chip tap fires one handler and a swap keeps all four players', function() {
    var ids = createSession('queue', ['A', 'B', 'C', 'D', 'E', 'F']);
    var grid = listeners('playerSelectGrid');
    var start = listeners('btnStartManual');
    var preview = listeners('selectedTeamsPreview');

    App.UI._showPlayerSelectForCourt('c_1');
    selectPlayers(grid[0], ids.slice(0, 4));
    var expected = App.Suggest.splitTeams(ids.slice(0, 4).map(function(id) { return App.state.players[id]; }));
    var a0 = expected.teamA[0];
    var b0 = expected.teamB[0];

    // Choose "Custom", then tap a Team A chip and a Team B chip to swap them
    preview[0](click({ '.team-split-option': fakeEl({ dataset: { sidx: 'custom' } }) }));
    preview[0](click({ '.custom-split-chip': fakeEl({ dataset: { pid: a0 } }) }));
    preview[0](click({ '.custom-split-chip': fakeEl({ dataset: { pid: b0 } }) }));
    start[0]();

    var match = App.state.matches[App.state.courts.c_1.currentMatch];
    assert.ok(match, 'game started from custom split');
    assert.strictEqual(match.teamA.length + match.teamB.length, 4, 'no player vanished');
    assert.ok(match.teamA.indexOf(b0) !== -1, 'B0 moved to team A');
    assert.ok(match.teamB.indexOf(a0) !== -1, 'A0 moved to team B');
  });

  it('split labels built from player names are escaped', function() {
    var ids = createSession('queue', [EVIL, 'B', 'C', 'D']);
    var grid = listeners('playerSelectGrid');
    App.UI._showPlayerSelectForCourt('c_1');
    selectPlayers(grid[0], ids);

    var html = document.getElementById('selectedTeamsPreview').innerHTML;
    assert.ok(html.indexOf('<img') === -1, 'raw tag must not appear');
    assert.ok(html.indexOf('&lt;img') !== -1, 'name is escaped');
  });
});

describe('Schedule "Create game" modal (#80)', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  it('binds the split-option listener once and honours the chosen option', function() {
    var ids = createSession('shuffle', ['A', 'B', 'C', 'D', 'E', 'F']);
    var grid = listeners('playerSelectGrid');
    var create = listeners('btnScheduleCreate');
    var preview = listeners('selectedTeamsPreview');

    App.UI._showScheduleCreateModal();
    selectPlayers(grid[0], ids.slice(0, 4));
    assert.strictEqual(preview.length, 1, 'preview listener is bound once');

    var expected = App.Suggest.splitTeams(ids.slice(0, 4).map(function(id) { return App.state.players[id]; })).allSplits[1];
    preview[0](click({ '.team-split-option': fakeEl({ dataset: { sidx: '1' } }) }));
    create[0]();

    assert.strictEqual(App.state.schedule.length, 1);
    assert.deepStrictEqual(App.state.schedule[0].teamA, expected.teamA);
    assert.deepStrictEqual(App.state.schedule[0].teamB, expected.teamB);
  });
});

describe('Player names and scores are escaped in innerHTML (#63)', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  it('wished-partner line in the Players list', function() {
    var ids = createSession('queue', ['Ola', EVIL]);
    App.state.players[ids[0]].wishedPartners = [ids[1]];
    App.UI.renderPlayers();
    var html = document.getElementById('playerList').innerHTML;
    assert.ok(html.indexOf('<img') === -1);
    assert.ok(html.indexOf('&lt;img') !== -1);
  });

  it('score in the History list', function() {
    var ids = createSession('queue', ['A', 'B', 'C', 'D']);
    App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
    App.Courts.finishGame('c_1', '21-15');
    var match = Object.values(App.state.matches)[0];
    match.score = '<s>21-15</s>';
    App.UI.renderHistory();
    var html = document.getElementById('historyList').innerHTML;
    assert.ok(html.indexOf('<s>') === -1);
    assert.ok(html.indexOf('&lt;s&gt;') !== -1);
  });

  it('court hints built from names', function() {
    var ids = createSession('queue', [EVIL, 'B', 'C', 'D']);
    App.state.players[ids[0]].partnerHistory[ids[1]] = 2;
    App.state.players[ids[1]].partnerHistory[ids[0]] = 2;
    var html = App.UI._renderCourtHints({ teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] });
    assert.ok(html.length > 0, 'a hint is rendered for the repeated pair');
    assert.ok(html.indexOf('<img') === -1);
  });

  it('delete-player confirmation message', function() {
    var ids = createSession('queue', [EVIL, 'B']);
    var list = listeners('playerList');
    App.UI._bindPlayers();
    var row = fakeEl({ dataset: { id: ids[0] } });
    var btn = fakeEl({ dataset: { action: 'delete' }, closest: function() { return row; } });
    list[list.length - 1](click({ '[data-action]': btn }));
    var html = document.getElementById('modalContent').innerHTML;
    assert.ok(html.indexOf('btnConfirmYes') !== -1, 'confirm modal shown');
    assert.ok(html.indexOf('<img') === -1);
    assert.ok(html.indexOf('&lt;img') !== -1);
  });

  it('suggestion modal split labels and reasons', function() {
    var ids = createSession('queue', [EVIL, 'B', 'C', 'D']);
    App.state.players[ids[0]].partnerHistory[ids[1]] = 2;
    App.state.players[ids[1]].partnerHistory[ids[0]] = 2;
    App.UI._suggestForCourt('c_1');
    var html = document.getElementById('modalContent').innerHTML;
    assert.ok(html.indexOf('<img') === -1);
    assert.ok(html.indexOf('&lt;img') !== -1);
  });
});
