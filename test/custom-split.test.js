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

function setupPlayersWithBench() {
  var ids = setupPlayers();

  // Add 2 more players on the bench (present, in queue, but not on a team)
  var benchIds = ['Eve', 'Frank'].map(function(name) {
    var id = App.Players.add(name);
    App.Players.markPresent(id);
    return id;
  });

  return { team: ids, bench: benchIds };
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

  describe('_handleCustomChipClick — team swaps', function() {
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

      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[2]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[2], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[0], ids[3]]);
      assert.strictEqual(App.UI._customSwapTarget, null);
    });

    it('should not swap players from the same team', function() {
      var ids = setupPlayers();
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[1]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[0], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[2], ids[3]]);
      assert.strictEqual(App.UI._customSwapTarget, null);
    });

    it('should swap second position players correctly', function() {
      var ids = setupPlayers();
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      App.UI._handleCustomChipClick(createMockChip(ids[1]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[3]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[0], ids[3]]);
      assert.deepStrictEqual(split.teamB, [ids[2], ids[1]]);
    });

    it('should allow multiple swaps in sequence', function() {
      var ids = setupPlayers();
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[2]), area, split);

      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[2]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[0], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[2], ids[3]]);
    });

    it('should work when clicking team B player first', function() {
      var ids = setupPlayers();
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      App.UI._handleCustomChipClick(createMockChip(ids[2]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[2], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[0], ids[3]]);
    });
  });

  describe('_handleCustomChipClick — bench swaps', function() {
    it('should replace team A player with bench player', function() {
      var setup = setupPlayersWithBench();
      var ids = setup.team;
      var bench = setup.bench;
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      // Click Alice (team A), then Eve (bench)
      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(bench[0]), area, split);

      assert.deepStrictEqual(split.teamA, [bench[0], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[2], ids[3]]);
    });

    it('should replace team B player with bench player', function() {
      var setup = setupPlayersWithBench();
      var ids = setup.team;
      var bench = setup.bench;
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      // Click Dave (team B), then Frank (bench)
      App.UI._handleCustomChipClick(createMockChip(ids[3]), area, split);
      App.UI._handleCustomChipClick(createMockChip(bench[1]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[0], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[2], bench[1]]);
    });

    it('should work when clicking bench player first then team player', function() {
      var setup = setupPlayersWithBench();
      var ids = setup.team;
      var bench = setup.bench;
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      // Click Eve (bench), then Bob (team A)
      App.UI._handleCustomChipClick(createMockChip(bench[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[1]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[0], bench[0]]);
      assert.deepStrictEqual(split.teamB, [ids[2], ids[3]]);
    });

    it('should not swap two bench players', function() {
      var setup = setupPlayersWithBench();
      var ids = setup.team;
      var bench = setup.bench;
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      // Click Eve (bench), then Frank (bench)
      App.UI._handleCustomChipClick(createMockChip(bench[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(bench[1]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[0], ids[1]]);
      assert.deepStrictEqual(split.teamB, [ids[2], ids[3]]);
      assert.strictEqual(App.UI._customSwapTarget, null);
    });

    it('should allow bench player to replace and then be swapped between teams', function() {
      var setup = setupPlayersWithBench();
      var ids = setup.team;
      var bench = setup.bench;
      var split = { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]] };
      var area = createMockArea();

      // Replace Alice with Eve
      App.UI._handleCustomChipClick(createMockChip(ids[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(bench[0]), area, split);

      // Now swap Eve (team A) with Carol (team B)
      App.UI._handleCustomChipClick(createMockChip(bench[0]), area, split);
      App.UI._handleCustomChipClick(createMockChip(ids[2]), area, split);

      assert.deepStrictEqual(split.teamA, [ids[2], ids[1]]);
      assert.deepStrictEqual(split.teamB, [bench[0], ids[3]]);
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
      ids.forEach(function(id) {
        assert.ok(html.includes('data-pid="' + id + '"'), 'HTML should contain data-pid for ' + id);
      });
    });

    it('should include bench players not on teams', function() {
      var setup = setupPlayersWithBench();
      var ids = setup.team;
      var bench = setup.bench;
      var html = App.UI._buildCustomSplitHtml([ids[0], ids[1]], [ids[2], ids[3]]);

      assert.ok(html.includes('customBench'), 'HTML should contain bench area');
      bench.forEach(function(id) {
        assert.ok(html.includes('data-pid="' + id + '"'), 'HTML should contain bench player ' + id);
      });
    });

    it('should not show bench when no extra players available', function() {
      App.Session.create();
      App.Session.initCourts([1]);
      // Only 4 players, all on teams
      var ids = ['A', 'B', 'C', 'D'].map(function(name) {
        var id = App.Players.add(name);
        App.Players.markPresent(id);
        return id;
      });

      var html = App.UI._buildCustomSplitHtml([ids[0], ids[1]], [ids[2], ids[3]]);
      assert.ok(!html.includes('customBench'), 'HTML should not contain bench when no extras');
    });
  });
});
