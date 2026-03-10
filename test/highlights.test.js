var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('_buildHighlights', function() {
  beforeEach(function() {
    App.Session.create();
  });

  function addPlayer(name) {
    return App.Players.add(name);
  }

  function addMatch(teamA, teamB, score, endTime) {
    var id = App.Utils.generateId('m-');
    App.state.matches[id] = {
      id: id,
      teamA: teamA,
      teamB: teamB,
      score: score,
      status: 'finished',
      endTime: endTime
    };
    return id;
  }

  function findHighlight(results, icon) {
    return results.find(function(h) { return h.icon === icon; });
  }

  it('should return empty array when no games played', function() {
    var p1 = addPlayer('Alice');
    var players = [App.state.players[p1]];
    players[0].gamesPlayed = 0;
    var result = App.UI._buildHighlights(players);
    assert.deepStrictEqual(result, []);
  });

  it('should return most active player', function() {
    var p1 = addPlayer('Alice');
    var p2 = addPlayer('Bob');
    App.state.players[p1].gamesPlayed = 5;
    App.state.players[p2].gamesPlayed = 3;
    var players = [App.state.players[p1], App.state.players[p2]];
    var result = App.UI._buildHighlights(players);
    var h = findHighlight(result, '🏸');
    assert.ok(h, 'most active highlight should exist');
    assert.ok(h.value.indexOf('5') !== -1, 'should show game count');
  });

  it('should detect win streak of 2+', function() {
    var p1 = addPlayer('Alice');
    var p2 = addPlayer('Bob');
    var p3 = addPlayer('Carol');
    var p4 = addPlayer('Dave');
    addMatch([p1, p2], [p3, p4], '21-15', 1000);
    addMatch([p1, p3], [p2, p4], '21-10', 2000);
    addMatch([p1, p4], [p2, p3], '21-18', 3000);

    [p1, p2, p3, p4].forEach(function(pid) {
      App.state.players[pid].gamesPlayed = 3;
    });

    var players = Object.values(App.state.players).filter(function(p) { return p.gamesPlayed > 0; });
    var h = findHighlight(App.UI._buildHighlights(players), '🔥');
    assert.ok(h, 'win streak highlight should exist');
    assert.ok(h.value.indexOf('3') !== -1, 'should show streak of 3');
  });

  it('should not show win streak below 2', function() {
    var p1 = addPlayer('Alice');
    var p2 = addPlayer('Bob');
    var p3 = addPlayer('Carol');
    var p4 = addPlayer('Dave');
    addMatch([p1, p2], [p3, p4], '21-15', 1000);
    addMatch([p3, p4], [p1, p2], '21-10', 2000);

    [p1, p2, p3, p4].forEach(function(pid) {
      App.state.players[pid].gamesPlayed = 2;
    });

    var players = Object.values(App.state.players).filter(function(p) { return p.gamesPlayed > 0; });
    var h = findHighlight(App.UI._buildHighlights(players), '🔥');
    assert.strictEqual(h, undefined);
  });

  it('should detect top scorer', function() {
    var p1 = addPlayer('Alice');
    var p2 = addPlayer('Bob');
    App.state.players[p1].gamesPlayed = 2;
    App.state.players[p1].pointsScored = 42;
    App.state.players[p2].gamesPlayed = 2;
    App.state.players[p2].pointsScored = 30;
    var players = [App.state.players[p1], App.state.players[p2]];
    var h = findHighlight(App.UI._buildHighlights(players), '🎯');
    assert.ok(h, 'top scorer highlight should exist');
    assert.ok(h.value.indexOf('42') !== -1, 'should show top score');
  });

  it('should not show top scorer when no scores tracked', function() {
    var p1 = addPlayer('Alice');
    App.state.players[p1].gamesPlayed = 3;
    var players = [App.state.players[p1]];
    var h = findHighlight(App.UI._buildHighlights(players), '🎯');
    assert.strictEqual(h, undefined);
  });

  it('should detect social butterfly with 2+ partners', function() {
    var p1 = addPlayer('Alice');
    var p2 = addPlayer('Bob');
    var p3 = addPlayer('Carol');
    App.state.players[p1].gamesPlayed = 3;
    App.state.players[p1].partnerHistory = { [p2]: 1, [p3]: 1 };
    App.state.players[p2].gamesPlayed = 1;
    App.state.players[p2].partnerHistory = { [p1]: 1 };
    App.state.players[p3].gamesPlayed = 1;
    App.state.players[p3].partnerHistory = { [p1]: 1 };
    var players = Object.values(App.state.players).filter(function(p) { return p.gamesPlayed > 0; });
    var h = findHighlight(App.UI._buildHighlights(players), '🦋');
    assert.ok(h, 'social butterfly highlight should exist');
    assert.ok(h.value.indexOf('2') !== -1, 'should show partner count');
  });

  it('should not show social butterfly with only 1 partner', function() {
    var p1 = addPlayer('Alice');
    var p2 = addPlayer('Bob');
    App.state.players[p1].gamesPlayed = 2;
    App.state.players[p1].partnerHistory = { [p2]: 2 };
    App.state.players[p2].gamesPlayed = 2;
    App.state.players[p2].partnerHistory = { [p1]: 2 };
    var players = Object.values(App.state.players).filter(function(p) { return p.gamesPlayed > 0; });
    var h = findHighlight(App.UI._buildHighlights(players), '🦋');
    assert.strictEqual(h, undefined);
  });

  it('should detect rivals with 2+ matchups', function() {
    var p1 = addPlayer('Alice');
    var p2 = addPlayer('Bob');
    App.state.players[p1].gamesPlayed = 3;
    App.state.players[p1].opponentHistory = { [p2]: 3 };
    App.state.players[p2].gamesPlayed = 3;
    App.state.players[p2].opponentHistory = { [p1]: 3 };
    var players = Object.values(App.state.players).filter(function(p) { return p.gamesPlayed > 0; });
    var h = findHighlight(App.UI._buildHighlights(players), '⚔️');
    assert.ok(h, 'rivals highlight should exist');
    assert.ok(h.value.indexOf('3') !== -1, 'should show matchup count');
  });

  it('should not show rivals with only 1 matchup', function() {
    var p1 = addPlayer('Alice');
    var p2 = addPlayer('Bob');
    App.state.players[p1].gamesPlayed = 1;
    App.state.players[p1].opponentHistory = { [p2]: 1 };
    App.state.players[p2].gamesPlayed = 1;
    App.state.players[p2].opponentHistory = { [p1]: 1 };
    var players = Object.values(App.state.players).filter(function(p) { return p.gamesPlayed > 0; });
    var h = findHighlight(App.UI._buildHighlights(players), '⚔️');
    assert.strictEqual(h, undefined);
  });

  it('should detect most patient player waiting > 1 min', function() {
    var p1 = addPlayer('Alice');
    var p2 = addPlayer('Bob');
    App.Players.markPresent(p1);
    App.Players.markPresent(p2);
    App.state.players[p1].gamesPlayed = 1;
    App.state.players[p2].gamesPlayed = 1;
    // Alice has been waiting 2 minutes, Bob 30 seconds
    App.state.players[p1].queueEntryTime = Date.now() - 120000;
    App.state.players[p2].queueEntryTime = Date.now() - 30000;
    var players = Object.values(App.state.players).filter(function(p) { return p.gamesPlayed > 0; });
    var h = findHighlight(App.UI._buildHighlights(players), '⏳');
    assert.ok(h, 'most patient highlight should exist');
    assert.ok(h.value.indexOf('2:0') !== -1, 'should show ~2min wait time');
  });

  it('should not show most patient when wait < 1 min', function() {
    var p1 = addPlayer('Alice');
    App.Players.markPresent(p1);
    App.state.players[p1].gamesPlayed = 1;
    App.state.players[p1].queueEntryTime = Date.now() - 10000;
    var players = [App.state.players[p1]];
    var h = findHighlight(App.UI._buildHighlights(players), '⏳');
    assert.strictEqual(h, undefined);
  });

  it('should show average wait time when > 30 sec', function() {
    var p1 = addPlayer('Alice');
    var p2 = addPlayer('Bob');
    App.state.players[p1].gamesPlayed = 2;
    App.state.players[p1].totalWaitTime = 120000;
    App.state.players[p1].waitCount = 2;
    App.state.players[p2].gamesPlayed = 1;
    App.state.players[p2].totalWaitTime = 60000;
    App.state.players[p2].waitCount = 1;
    var players = [App.state.players[p1], App.state.players[p2]];
    var h = findHighlight(App.UI._buildHighlights(players), '⏱️');
    assert.ok(h, 'avg wait time highlight should exist');
  });

  it('should not show average wait time when < 30 sec', function() {
    var p1 = addPlayer('Alice');
    App.state.players[p1].gamesPlayed = 1;
    App.state.players[p1].totalWaitTime = 10000;
    App.state.players[p1].waitCount = 1;
    var players = [App.state.players[p1]];
    var h = findHighlight(App.UI._buildHighlights(players), '⏱️');
    assert.strictEqual(h, undefined);
  });
});
