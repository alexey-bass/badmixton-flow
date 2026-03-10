var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp, createMockElement } = require('./helpers');

var App = loadApp();

function setupPlayers() {
  App.Session.create();
  App.Session.initCourts([1]);

  var ids = ['Alice', 'Bob', 'Carol', 'Dave'].map(function(name) {
    var id = App.Players.add(name);
    App.Players.markPresent(id);
    return id;
  });

  return ids;
}

function createMockChip(pid) {
  return createMockElement({ dataset: { pid: pid } });
}

function createMockArea() {
  return createMockElement({
    querySelectorAll: function() {
      return [createMockChip('x')]; // dummy chips for classList operations
    },
    querySelector: function() {
      return createMockElement();
    }
  });
}

describe('Custom team split', function() {
  beforeEach(function() {
    localStorage.clear();
    App.UI._customSwapTarget = null;
  });

  describe('_handleCustomChipClick', function() {
    it('should select first player on first click', function() {
      var ids = setupPlayers();
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var chip = createMockChip(ids[0]);
      var area = createMockArea();

      App.UI._handleCustomChipClick(chip, area, split);

      assert.strictEqual(App.UI._customSwapTarget, ids[0]);
    });

    it('should swap players from different teams on second click', function() {
      var ids = setupPlayers();
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      // First click: select Alice (team A)
      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);
      // Second click: select Carol (team B)
      App.UI._handleCustomChipClick(createMockChip(ids[2]), area, split);

      // Alice and Carol should be swapped
      assert.deepStrictEqual(split.teamA, [ids[2], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[0], ids[3]]);
      assert.strictEqual(App.UI._customSwapTarget, null);
    });

    it('should not swap players from the same team', function() {
      var ids = setupPlayers();
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      // First click: select Alice (team A)
      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);
      // Second click: select Bob (also team A)
      App.UI._handleCustomChipClick(createMockChip(ids[1]), area, split);

      // Teams should remain unchanged
      assert.deepStrictEqual(split.teamA, [ids[0], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[2], ids[3]]);
      assert.strictEqual(App.UI._customSwapTarget, null);
    });

    it('should swap second position players correctly', function() {
      var ids = setupPlayers();
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      // Swap Bob (team A[1]) with Dave (team B[1])
      App.UI._handleCustomChipClick(createMockChip(ids[1]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[3]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[0], ids[3]]);
      assert.deepStrictEqual(split.teamB, [ids[2], ids[1]]);
    });

    it('should allow multiple swaps in sequence', function() {
      var ids = setupPlayers();
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      // Swap Alice <-> Carol
      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[2]), area, split);

      // Now swap them back
      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[2]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[0], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[2], ids[3]]);
    });

    it('should work when clicking team B player first', function() {
      var ids = setupPlayers();
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      // First click: Carol (team B), then Alice (team A)
      App.UI._handleCustomChipClick(createMockChip(ids[2]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[2], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[0], ids[3]]);
    });
  });

  describe('_buildCustomSplitHtml', function() {
    it('should return HTML with correct structure and player IDs', function() {
      var ids = setupPlayers();
      var html = App.UI._buildCustomSplitHtml([ids[0], ids[1]], [ids[2], ids[3]]);

      assert.ok(html.includes('customSplitArea'));
      assert.ok(html.includes('custom-split-team-a'));
      assert.ok(html.includes('custom-split-team-b'));
      assert.ok(html.includes('custom-split-chip'));
      // Player IDs should be in data-pid attributes
      ids.forEach(function(id) {
        assert.ok(html.includes('data-pid="' + id + '"'), 'HTML should contain data-pid for ' + id);
      });
    });
  });
});
