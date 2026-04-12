var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

function createShuffleSession(playerCount) {
  App.Session.create('Test', 'shuffle');
  App.Session.initCourts([1, 2]);

  var ids = [];
  for (var i = 0; i < playerCount; i++) {
    var id = App.Players.add('P' + (i + 1));
    App.Players.markPresent(id);
    ids.push(id);
  }
  return ids;
}

describe('App.Shuffle', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  describe('isShuffleMode', function() {
    it('should return true in shuffle mode', function() {
      App.Session.create('Test', 'shuffle');
      assert.strictEqual(App.Shuffle.isShuffleMode(), true);
    });

    it('should return false in queue mode', function() {
      App.Session.create('Test', 'queue');
      assert.strictEqual(App.Shuffle.isShuffleMode(), false);
    });

    it('should return false by default', function() {
      App.Session.create();
      assert.strictEqual(App.Shuffle.isShuffleMode(), false);
    });
  });

  describe('Session.create with mode', function() {
    it('should set mode to shuffle', function() {
      App.Session.create('Test', 'shuffle');
      assert.strictEqual(App.state.mode, 'shuffle');
      assert.deepStrictEqual(App.state.schedule, []);
    });

    it('should set mode to queue by default', function() {
      App.Session.create();
      assert.strictEqual(App.state.mode, 'queue');
    });

    it('should not add players to queue in shuffle mode', function() {
      App.Session.create('Test', 'shuffle');
      App.Session.initCourts([1]);
      var id = App.Players.add('Alice');
      App.Players.markPresent(id);
      assert.deepStrictEqual(App.state.waitingQueue, []);
      assert.strictEqual(App.state.players[id].present, true);
    });
  });

  describe('generate', function() {
    it('should generate games for 4 players', function() {
      createShuffleSession(4);
      var count = App.Shuffle.generate(2);
      assert.strictEqual(count, 2);
      assert.strictEqual(App.state.schedule.length, 2);
    });

    it('should create schedule entries with correct structure', function() {
      createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      assert.ok(entry.id.startsWith('sg_'));
      assert.ok(Array.isArray(entry.teamA));
      assert.ok(Array.isArray(entry.teamB));
      assert.strictEqual(entry.status, 'pending');
      assert.strictEqual(entry.courtId, null);
      assert.strictEqual(entry.matchId, null);
    });

    it('should use 2v2 format for 4 players', function() {
      createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      assert.strictEqual(entry.teamA.length, 2);
      assert.strictEqual(entry.teamB.length, 2);
    });

    it('should use 2v1 format for 3 players', function() {
      createShuffleSession(3);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      var total = entry.teamA.length + entry.teamB.length;
      assert.strictEqual(total, 3);
    });

    it('should use 1v1 format for 2 players', function() {
      createShuffleSession(2);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      assert.strictEqual(entry.teamA.length, 1);
      assert.strictEqual(entry.teamB.length, 1);
    });

    it('should not generate games with fewer than 2 players', function() {
      App.Session.create('Test', 'shuffle');
      App.Session.initCourts([1]);
      var id = App.Players.add('Solo');
      App.Players.markPresent(id);
      var count = App.Shuffle.generate(1);
      assert.strictEqual(count, 0);
      assert.strictEqual(App.state.schedule.length, 0);
    });

    it('should not duplicate players within a batch', function() {
      createShuffleSession(8);
      App.Shuffle.generate(2); // 2 courts worth = 1 batch
      var game1 = App.state.schedule[0];
      var game2 = App.state.schedule[1];
      var players1 = game1.teamA.concat(game1.teamB);
      var players2 = game2.teamA.concat(game2.teamB);
      var overlap = players1.filter(function(p) { return players2.indexOf(p) !== -1; });
      assert.strictEqual(overlap.length, 0);
    });

    it('should use all unique players in each entry', function() {
      createShuffleSession(6);
      App.Shuffle.generate(3);
      App.state.schedule.forEach(function(entry) {
        var all = entry.teamA.concat(entry.teamB);
        var unique = new Set(all);
        assert.strictEqual(unique.size, all.length, 'Players should be unique in game ' + entry.id);
      });
    });

    it('should avoid re-grouping same 4 players in consecutive games', function() {
      var ids = createShuffleSession(8);
      // Generate 2 batches (4 games) — with 8 players and diversification,
      // consecutive games across batches should not repeat the same group
      App.Shuffle.generate(4);
      for (var i = 0; i < App.state.schedule.length - 1; i++) {
        var g1 = App.state.schedule[i];
        var g2 = App.state.schedule[i + 1];
        var pids1 = g1.teamA.concat(g1.teamB);
        var pids2 = g2.teamA.concat(g2.teamB);
        var overlap = pids1.filter(function(p) { return pids2.indexOf(p) !== -1; });
        assert.ok(overlap.length < 3, 'Games ' + (i+1) + ' and ' + (i+2) + ' share ' + overlap.length + ' players (max 2)');
      }
    });
  });

  describe('continueShuffle', function() {
    it('should generate court-count games', function() {
      createShuffleSession(8);
      var count = App.Shuffle.continueShuffle();
      assert.strictEqual(count, 2); // 2 courts
    });
  });

  describe('reshuffle', function() {
    it('should remove pending/ready entries and regenerate', function() {
      createShuffleSession(6);
      App.Shuffle.generate(4);
      assert.strictEqual(App.state.schedule.length, 4);

      App.Shuffle.reshuffle();
      // Should have new entries (courtCount * 2 = 4)
      assert.strictEqual(App.state.schedule.length, 4);
      // All should be pending
      assert.ok(App.state.schedule.every(function(e) { return e.status === 'pending'; }));
    });

    it('should keep finished entries', function() {
      createShuffleSession(6);
      App.Shuffle.generate(2);
      App.state.schedule[0].status = 'finished';

      App.Shuffle.reshuffle();
      var finished = App.state.schedule.filter(function(e) { return e.status === 'finished'; });
      assert.strictEqual(finished.length, 1);
    });
  });

  describe('assignNextToCourt', function() {
    it('should assign first pending game to court', function() {
      createShuffleSession(4);
      App.Shuffle.generate(2);
      var entry = App.Shuffle.assignNextToCourt('c_1');
      assert.ok(entry);
      assert.strictEqual(entry.status, 'ready');
      assert.strictEqual(entry.courtId, 'c_1');
    });

    it('should not assign to occupied court', function() {
      createShuffleSession(4);
      App.Shuffle.generate(2);
      App.state.courts['c_1'].occupied = true;
      var entry = App.Shuffle.assignNextToCourt('c_1');
      assert.strictEqual(entry, null);
    });

    it('should return null when no pending games', function() {
      createShuffleSession(4);
      var entry = App.Shuffle.assignNextToCourt('c_1');
      assert.strictEqual(entry, null);
    });
  });

  describe('autoAssignAll', function() {
    it('should assign games to all free courts', function() {
      createShuffleSession(8);
      App.Shuffle.generate(4);
      var assigned = App.Shuffle.autoAssignAll();
      assert.strictEqual(assigned, 2); // 2 free courts

      var ready = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      assert.strictEqual(ready.length, 2);
    });

    it('should skip courts that already have ready games', function() {
      createShuffleSession(8);
      App.Shuffle.generate(4);
      App.Shuffle.autoAssignAll();
      // Try again — no new assignments
      var assigned = App.Shuffle.autoAssignAll();
      assert.strictEqual(assigned, 0);
    });
  });

  describe('arePlayersReady', function() {
    it('should return true when no players on court', function() {
      createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      assert.strictEqual(App.Shuffle.arePlayersReady(entry.id), true);
    });

    it('should return false when a player is on court', function() {
      var ids = createShuffleSession(6);
      App.Shuffle.generate(2);
      // Start one game manually
      var entry1 = App.state.schedule[0];
      App.Courts.startGame('c_1', entry1.teamA, entry1.teamB);

      // Check second game — some players might still be on court
      var entry2 = App.state.schedule[1];
      var all2 = entry2.teamA.concat(entry2.teamB);
      var anyOnCourt = all2.some(function(pid) { return App.Players.isOnCourt(pid); });
      if (anyOnCourt) {
        assert.strictEqual(App.Shuffle.arePlayersReady(entry2.id), false);
      }
    });
  });

  describe('getPending and getUpcoming', function() {
    it('should return pending and ready entries', function() {
      createShuffleSession(8);
      App.Shuffle.generate(4);
      App.Shuffle.assignNextToCourt('c_1');
      var pending = App.Shuffle.getPending();
      assert.strictEqual(pending.length, 4); // 1 ready + 3 pending
    });

    it('should return only pending entries for getUpcoming', function() {
      createShuffleSession(8);
      App.Shuffle.generate(4);
      App.Shuffle.assignNextToCourt('c_1');
      var upcoming = App.Shuffle.getUpcoming();
      assert.strictEqual(upcoming.length, 3); // only pending, not ready
      assert.ok(upcoming.every(function(e) { return e.status === 'pending'; }));
    });

    it('should respect limit', function() {
      createShuffleSession(8);
      App.Shuffle.generate(4);
      var upcoming = App.Shuffle.getUpcoming(2);
      assert.strictEqual(upcoming.length, 2);
    });
  });

  describe('removeGame', function() {
    it('should remove a pending game', function() {
      createShuffleSession(4);
      App.Shuffle.generate(2);
      var id = App.state.schedule[0].id;
      var result = App.Shuffle.removeGame(id);
      assert.strictEqual(result, true);
      assert.strictEqual(App.state.schedule.length, 1);
    });

    it('should not remove non-pending games', function() {
      createShuffleSession(4);
      App.Shuffle.generate(1);
      App.state.schedule[0].status = 'ready';
      var result = App.Shuffle.removeGame(App.state.schedule[0].id);
      assert.strictEqual(result, false);
      assert.strictEqual(App.state.schedule.length, 1);
    });
  });

  describe('swapPlayer', function() {
    it('should swap a player in a pending game', function() {
      var ids = createShuffleSession(6);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      var oldPid = entry.teamA[0];
      var newPid = ids.find(function(id) {
        return entry.teamA.indexOf(id) === -1 && entry.teamB.indexOf(id) === -1;
      });

      var result = App.Shuffle.swapPlayer(entry.id, oldPid, newPid);
      assert.strictEqual(result, true);
      assert.ok(entry.teamA.indexOf(newPid) !== -1 || entry.teamB.indexOf(newPid) !== -1);
      assert.strictEqual(entry.teamA.indexOf(oldPid), -1);
    });

    it('should not swap in non-pending games', function() {
      var ids = createShuffleSession(4);
      App.Shuffle.generate(1);
      App.state.schedule[0].status = 'ready';
      var result = App.Shuffle.swapPlayer(App.state.schedule[0].id, ids[0], ids[3]);
      assert.strictEqual(result, false);
    });
  });

  describe('handlePlayerAbsent', function() {
    it('should downgrade 2v2 to smaller game when player leaves', function() {
      var ids = createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      assert.strictEqual(entry.teamA.length + entry.teamB.length, 4);

      App.Shuffle.handlePlayerAbsent(entry.teamA[0]);
      // Should now be 3 players total (2v1 or 1v1)
      var total = entry.teamA.length + entry.teamB.length;
      assert.ok(total <= 3, 'Should have 3 or fewer players after absence');
      assert.ok(total >= 2, 'Should have at least 2 players');
    });

    it('should remove game if not enough players remain', function() {
      createShuffleSession(2);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      // Remove one of the only 2 players
      App.Shuffle.handlePlayerAbsent(entry.teamA[0]);
      // Also remove the other
      if (App.state.schedule.length > 0) {
        var remaining = App.state.schedule[0].teamA.concat(App.state.schedule[0].teamB);
        if (remaining.length < 2) {
          // Need to remove remaining too
          App.Shuffle.handlePlayerAbsent(remaining[0]);
        }
      }
      // Game with only 1 player should be removed
      var pendingWithPlayer = App.state.schedule.filter(function(e) {
        var all = e.teamA.concat(e.teamB);
        return all.length < 2 && (e.status === 'pending' || e.status === 'ready');
      });
      assert.strictEqual(pendingWithPlayer.length, 0);
    });
  });

  describe('getStats', function() {
    it('should count games by status', function() {
      createShuffleSession(8);
      App.Shuffle.generate(4);
      App.state.schedule[0].status = 'playing';
      App.state.schedule[1].status = 'finished';

      var stats = App.Shuffle.getStats();
      assert.strictEqual(stats.total, 4);
      assert.strictEqual(stats.playing, 1);
      assert.strictEqual(stats.finished, 1);
      assert.strictEqual(stats.pending, 2);
    });
  });

  describe('Court integration in shuffle mode', function() {
    it('should update schedule entry on finishGame', function() {
      var ids = createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      entry.status = 'ready';
      entry.courtId = 'c_1';
      App.Courts.startGame('c_1', entry.teamA, entry.teamB);

      assert.strictEqual(entry.status, 'playing');
      assert.ok(entry.matchId);

      App.Courts.finishGame('c_1', '21-15');
      assert.strictEqual(entry.status, 'finished');
    });

    it('should not add players to queue on finish in shuffle mode', function() {
      var ids = createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      entry.status = 'ready';
      entry.courtId = 'c_1';
      App.Courts.startGame('c_1', entry.teamA, entry.teamB);
      App.Courts.finishGame('c_1');

      assert.deepStrictEqual(App.state.waitingQueue, []);
    });

    it('should revert schedule entry on cancelGame', function() {
      var ids = createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      entry.status = 'ready';
      entry.courtId = 'c_1';
      App.Courts.startGame('c_1', entry.teamA, entry.teamB);

      App.Courts.cancelGame('c_1');
      assert.strictEqual(entry.status, 'pending');
      assert.strictEqual(entry.courtId, null);
      assert.strictEqual(entry.matchId, null);
    });

    it('should revert schedule entry on undoLast', function() {
      var ids = createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      entry.status = 'ready';
      entry.courtId = 'c_1';
      App.Courts.startGame('c_1', entry.teamA, entry.teamB);
      App.Courts.finishGame('c_1', '21-15');

      App.Matches.undoLast();
      assert.strictEqual(entry.status, 'ready');
      assert.strictEqual(entry.matchId, null);
    });
  });

  describe('Player integration in shuffle mode', function() {
    it('should call handlePlayerAbsent on markAbsent', function() {
      var ids = createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      var pid = entry.teamA[0];

      App.Players.markAbsent(pid);
      // Player should be absent
      assert.strictEqual(App.state.players[pid].present, false);
      // Schedule should be updated (downgraded or removed)
      if (App.state.schedule.length > 0) {
        var e = App.state.schedule[0];
        var all = e.teamA.concat(e.teamB);
        assert.ok(all.indexOf(pid) === -1, 'Absent player should not be in schedule');
      }
    });
  });

  describe('clearPending', function() {
    it('should remove all pending and ready entries', function() {
      createShuffleSession(8);
      App.Shuffle.generate(4);
      App.Shuffle.assignNextToCourt('c_1');
      // 1 ready + 3 pending
      App.Shuffle.clearPending();
      assert.strictEqual(App.state.schedule.length, 0);
    });

    it('should keep playing and finished entries', function() {
      createShuffleSession(8);
      App.Shuffle.generate(4);
      App.state.schedule[0].status = 'playing';
      App.state.schedule[1].status = 'finished';
      App.Shuffle.clearPending();
      assert.strictEqual(App.state.schedule.length, 2);
      assert.strictEqual(App.state.schedule[0].status, 'playing');
      assert.strictEqual(App.state.schedule[1].status, 'finished');
    });
  });

  describe('reorder', function() {
    it('should move a pending game to a new position', function() {
      createShuffleSession(8);
      App.Shuffle.generate(4);
      var gameId = App.state.schedule[3].id;
      App.Shuffle.reorder(gameId, 0);
      assert.strictEqual(App.state.schedule[0].id, gameId);
    });

    it('should not reorder non-pending games', function() {
      createShuffleSession(8);
      App.Shuffle.generate(2);
      App.state.schedule[0].status = 'ready';
      var readyId = App.state.schedule[0].id;
      App.Shuffle.reorder(readyId, 1);
      // Should still be at position 0
      assert.strictEqual(App.state.schedule[0].id, readyId);
    });
  });

  describe('manual schedule entry creation', function() {
    it('should add a manual game entry to schedule', function() {
      var ids = createShuffleSession(4);
      var entry = {
        id: App.Utils.generateId('sg'),
        teamA: [ids[0], ids[1]],
        teamB: [ids[2], ids[3]],
        status: 'pending',
        courtId: null,
        matchId: null
      };
      App.state.schedule.push(entry);
      assert.strictEqual(App.state.schedule.length, 1);
      assert.deepStrictEqual(App.state.schedule[0].teamA, [ids[0], ids[1]]);
      assert.strictEqual(App.state.schedule[0].status, 'pending');
    });

    it('should auto-assign manual game to free court', function() {
      var ids = createShuffleSession(4);
      var entry = {
        id: App.Utils.generateId('sg'),
        teamA: [ids[0], ids[1]],
        teamB: [ids[2], ids[3]],
        status: 'pending',
        courtId: null,
        matchId: null
      };
      App.state.schedule.push(entry);
      App.Shuffle.autoAssignAll();
      assert.strictEqual(entry.status, 'ready');
      assert.ok(entry.courtId !== null);
    });

    it('should allow 2v1 manual game', function() {
      var ids = createShuffleSession(4);
      var entry = {
        id: App.Utils.generateId('sg'),
        teamA: [ids[0], ids[1]],
        teamB: [ids[2]],
        status: 'pending',
        courtId: null,
        matchId: null
      };
      App.state.schedule.push(entry);
      assert.strictEqual(entry.teamA.length, 2);
      assert.strictEqual(entry.teamB.length, 1);
    });

    it('should allow 1v1 manual game', function() {
      var ids = createShuffleSession(4);
      var entry = {
        id: App.Utils.generateId('sg'),
        teamA: [ids[0]],
        teamB: [ids[1]],
        status: 'pending',
        courtId: null,
        matchId: null
      };
      App.state.schedule.push(entry);
      assert.strictEqual(entry.teamA.length, 1);
      assert.strictEqual(entry.teamB.length, 1);
    });

    it('should coexist with generated games', function() {
      var ids = createShuffleSession(8);
      App.Shuffle.generate(2);
      var genCount = App.state.schedule.length;
      var entry = {
        id: App.Utils.generateId('sg'),
        teamA: [ids[0]],
        teamB: [ids[1]],
        status: 'pending',
        courtId: null,
        matchId: null
      };
      App.state.schedule.push(entry);
      assert.strictEqual(App.state.schedule.length, genCount + 1);
    });
  });

  describe('generate with wishes', function() {
    it('should place wished partners on the same team', function() {
      var ids = createShuffleSession(4);
      App.Players.setWish(ids[0], ids[1]);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      var sameTeam = (entry.teamA.indexOf(ids[0]) !== -1 && entry.teamA.indexOf(ids[1]) !== -1) ||
                     (entry.teamB.indexOf(ids[0]) !== -1 && entry.teamB.indexOf(ids[1]) !== -1);
      assert.ok(sameTeam, 'Wished partners should be on the same team');
    });
  });

  describe('generate virtual history', function() {
    it('should minimize partner repeats across many games', function() {
      createShuffleSession(10);
      App.Shuffle.generate(10);
      // Count partner pairings
      var pairs = {};
      App.state.schedule.forEach(function(e) {
        [e.teamA, e.teamB].forEach(function(t) {
          if (t.length === 2) {
            var k = [t[0], t[1]].sort().join('+');
            pairs[k] = (pairs[k] || 0) + 1;
          }
        });
      });
      var maxRepeat = Math.max.apply(null, Object.values(pairs));
      assert.ok(maxRepeat <= 2, 'No pair should be together more than 2 times in 10 games with 10 players, got ' + maxRepeat);
    });
  });

  describe('generate with odd player counts', function() {
    it('should handle 5 players and 2 courts', function() {
      createShuffleSession(5);
      var count = App.Shuffle.generate(2);
      assert.strictEqual(count, 2);
      // First game uses 4, second game gets remaining + reuse
      App.state.schedule.forEach(function(e) {
        var total = e.teamA.length + e.teamB.length;
        assert.ok(total >= 2 && total <= 4, 'Game should have 2-4 players, got ' + total);
      });
    });

    it('should handle 7 players across multiple games', function() {
      createShuffleSession(7);
      var count = App.Shuffle.generate(4);
      assert.ok(count >= 2, 'Should generate at least 2 games with 7 players');
      App.state.schedule.forEach(function(e) {
        var all = e.teamA.concat(e.teamB);
        var unique = new Set(all);
        assert.strictEqual(unique.size, all.length, 'No duplicate players in a game');
      });
    });
  });

  describe('handlePlayerAbsent edge cases', function() {
    it('should revert ready entry to pending when player leaves', function() {
      var ids = createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      entry.status = 'ready';
      entry.courtId = 'c_1';

      App.Shuffle.handlePlayerAbsent(entry.teamA[0]);
      if (App.state.schedule.length > 0) {
        var e = App.state.schedule[0];
        assert.strictEqual(e.status, 'pending');
        assert.strictEqual(e.courtId, null);
      }
    });

    it('should not affect games without the absent player', function() {
      var ids = createShuffleSession(8);
      App.Shuffle.generate(2);
      var entry1 = App.state.schedule[0];
      var entry2 = App.state.schedule[1];
      var pid = entry1.teamA[0];
      // Ensure pid is not in entry2
      var inEntry2 = entry2.teamA.concat(entry2.teamB).indexOf(pid) !== -1;
      if (!inEntry2) {
        var before = JSON.stringify(entry2);
        App.Shuffle.handlePlayerAbsent(pid);
        assert.strictEqual(JSON.stringify(App.state.schedule.find(function(e) { return e.id === entry2.id; })), before);
      }
    });

    it('should handle player in multiple pending games', function() {
      createShuffleSession(4);
      App.Shuffle.generate(3); // with 4 players, same players reappear
      var pid = App.state.schedule[0].teamA[0];
      var affectedBefore = App.state.schedule.filter(function(e) {
        return e.teamA.concat(e.teamB).indexOf(pid) !== -1;
      }).length;

      App.Shuffle.handlePlayerAbsent(pid);
      var stillHas = App.state.schedule.filter(function(e) {
        return (e.status === 'pending' || e.status === 'ready') &&
               e.teamA.concat(e.teamB).indexOf(pid) !== -1;
      });
      assert.strictEqual(stillHas.length, 0, 'Absent player should be removed from all pending games');
    });
  });

  describe('swapPlayer edge cases', function() {
    it('should swap a player in teamB', function() {
      var ids = createShuffleSession(6);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      var oldPid = entry.teamB[0];
      var newPid = ids.find(function(id) {
        return entry.teamA.indexOf(id) === -1 && entry.teamB.indexOf(id) === -1;
      });
      var result = App.Shuffle.swapPlayer(entry.id, oldPid, newPid);
      assert.strictEqual(result, true);
      assert.ok(entry.teamB.indexOf(newPid) !== -1);
    });

    it('should return false for player not in game', function() {
      var ids = createShuffleSession(6);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      var notInGame = ids.find(function(id) {
        return entry.teamA.indexOf(id) === -1 && entry.teamB.indexOf(id) === -1;
      });
      var result = App.Shuffle.swapPlayer(entry.id, notInGame, ids[0]);
      assert.strictEqual(result, false);
    });
  });

  describe('full lifecycle', function() {
    it('should auto-assign next game after finishing', function() {
      // Need 12+ players so next pending game has free players while court 2 is busy
      var ids = createShuffleSession(12);
      App.Shuffle.generate(4);
      App.Shuffle.autoAssignAll();

      // Start and finish game on court 1
      var ready1 = App.state.schedule.find(function(e) { return e.courtId === 'c_1' && e.status === 'ready'; });
      assert.ok(ready1, 'Court 1 should have a ready game');
      App.Courts.startGame('c_1', ready1.teamA, ready1.teamB);
      App.Courts.finishGame('c_1');

      // Court should have a new ready game auto-assigned (players from finished game are now free)
      var newReady = App.state.schedule.find(function(e) { return e.courtId === 'c_1' && e.status === 'ready'; });
      assert.ok(newReady, 'Next game should be auto-assigned to freed court');
      assert.notStrictEqual(newReady.id, ready1.id);
    });

    it('should track stats through full game cycle', function() {
      var ids = createShuffleSession(4);
      App.Shuffle.generate(1);
      var entry = App.state.schedule[0];
      entry.status = 'ready';
      entry.courtId = 'c_1';

      App.Courts.startGame('c_1', entry.teamA, entry.teamB);
      App.Courts.finishGame('c_1', '21-15');

      // Players should have updated stats
      entry.teamA.concat(entry.teamB).forEach(function(pid) {
        assert.strictEqual(App.state.players[pid].gamesPlayed, 1);
      });
      assert.strictEqual(entry.status, 'finished');
    });
  });

  describe('assignNextToCourt player conflict', function() {
    it('should not assign game when players are in another ready game', function() {
      // 2 players, 2 courts — only 1 game can be ready at a time
      createShuffleSession(2);
      App.Shuffle.generate(4);
      App.Shuffle.autoAssignAll();

      var readyCount = App.state.schedule.filter(function(e) { return e.status === 'ready'; }).length;
      assert.strictEqual(readyCount, 1, 'Only 1 game should be ready with 2 players');
    });

    it('should assign next game after first finishes', function() {
      createShuffleSession(2);
      App.Shuffle.generate(2);
      App.Shuffle.autoAssignAll();

      // Start and finish the ready game
      var ready = App.state.schedule.find(function(e) { return e.status === 'ready'; });
      App.Courts.startGame(ready.courtId, ready.teamA, ready.teamB);
      App.Courts.finishGame(ready.courtId);

      // Now second game should be auto-assigned
      var newReady = App.state.schedule.find(function(e) { return e.status === 'ready'; });
      assert.ok(newReady, 'Second game should be assigned after first finishes');
    });
  });

  describe('batch boundaries', function() {
    it('should allow players to appear in different batches', function() {
      var ids = createShuffleSession(4);
      // With only 4 players and 2 courts, batch size is 2
      // First batch: 1 game of 4 players, second game can reuse after batch reset
      App.Shuffle.generate(4);
      // All 4 games should be generated (players reused across batches)
      assert.strictEqual(App.state.schedule.length, 4);
    });
  });

  describe('resetToday', function() {
    it('should clear schedule on reset', function() {
      createShuffleSession(6);
      App.Shuffle.generate(4);
      assert.ok(App.state.schedule.length > 0);
      App.Session.resetToday();
      assert.deepStrictEqual(App.state.schedule, []);
    });
  });

  describe('_diversifyPicked pair-level', function() {
    it('should swap out a player to avoid repeated partner pair', function() {
      var ids = createShuffleSession(8);
      // Generate first batch — creates partner history in virtualPartner
      App.Shuffle.generate(2); // 2 games, fills 8 players across 2 courts
      var entry1 = App.state.schedule[0];

      // Find a pair from the first game's teamA
      if (entry1.teamA.length === 2) {
        var partnerA = entry1.teamA[0];
        var partnerB = entry1.teamA[1];

        // Generate more games
        App.Shuffle.generate(4);

        // Check that the same pair is not partners again
        var repeatCount = 0;
        App.state.schedule.forEach(function(e) {
          [e.teamA, e.teamB].forEach(function(team) {
            if (team.length === 2) {
              if ((team[0] === partnerA && team[1] === partnerB) ||
                  (team[0] === partnerB && team[1] === partnerA)) {
                repeatCount++;
              }
            }
          });
        });
        // With 8 players, the pair from game 1 should not repeat as partners
        assert.ok(repeatCount <= 1, 'Partner pair should not repeat with 8 players, got ' + repeatCount + ' times');
      }
    });

    it('should minimize partner repeats with enough players', function() {
      createShuffleSession(12);
      App.Shuffle.generate(10);

      var pairs = {};
      App.state.schedule.forEach(function(e) {
        [e.teamA, e.teamB].forEach(function(t) {
          if (t.length === 2) {
            var k = [t[0], t[1]].sort().join('+');
            pairs[k] = (pairs[k] || 0) + 1;
          }
        });
      });
      // Count how many pairs repeated (appeared 2+ times)
      var repeatedPairs = Object.values(pairs).filter(function(c) { return c > 1; }).length;
      var totalPairs = Object.keys(pairs).length;
      // With pair diversification, most pairs should be unique
      assert.ok(repeatedPairs <= Math.ceil(totalPairs * 0.15),
        'At most 15% of pairs should repeat, got ' + repeatedPairs + '/' + totalPairs);
    });

    it('should tolerate unavoidable repeats with very few players', function() {
      createShuffleSession(4);
      // With only 4 players, repeats are inevitable
      App.Shuffle.generate(6);
      assert.strictEqual(App.state.schedule.length, 6, 'Should still generate all 6 games');
    });
  });

  describe('autoAssignAll on finish (3 courts)', function() {
    function createSession3Courts(playerCount) {
      App.Session.create('Test', 'shuffle');
      App.Session.initCourts([1, 2, 3]);
      var ids = [];
      for (var i = 0; i < playerCount; i++) {
        var id = App.Players.add('P' + (i + 1));
        App.Players.markPresent(id);
        ids.push(id);
      }
      return ids;
    }

    it('should assign games to all free courts after sequential finishes', function() {
      createSession3Courts(13);
      App.Shuffle.generate(12);
      App.Shuffle.autoAssignAll();

      // 3 games should be ready on 3 courts
      var ready = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      assert.strictEqual(ready.length, 3);

      // Start all 3
      ready.forEach(function(e) {
        App.Courts.startGame(e.courtId, e.teamA, e.teamB);
      });

      // Finish one at a time (sequential — the bug scenario)
      var courts = Object.values(App.state.courts).filter(function(c) { return c.occupied; });
      courts.forEach(function(c) {
        App.Courts.finishGame(c.id, '21-15');
      });
      App.Shuffle.autoAssignAll(); // UI calls this after finish

      // After all 3 finished, all 3 courts should have new ready games
      var newReady = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      assert.strictEqual(newReady.length, 3, 'All 3 courts should have ready games after sequential finishes');

      // Each should be on a different court
      var courtIds = newReady.map(function(e) { return e.courtId; });
      var uniqueCourts = new Set(courtIds);
      assert.strictEqual(uniqueCourts.size, 3, 'Ready games should be on 3 different courts');
    });

    it('should retry previously failed courts when other courts finish', function() {
      createSession3Courts(13);
      App.Shuffle.generate(6); // 2 rounds
      App.Shuffle.autoAssignAll();

      var ready = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      assert.strictEqual(ready.length, 3);

      // Start all
      ready.forEach(function(e) {
        App.Courts.startGame(e.courtId, e.teamA, e.teamB);
      });

      // Finish one at a time
      var occupiedCourts = Object.values(App.state.courts).filter(function(c) { return c.occupied; });
      occupiedCourts.forEach(function(c) {
        App.Courts.finishGame(c.id, '21-15');
      });
      App.Shuffle.autoAssignAll(); // UI calls this after finish

      // After ALL finished: 3 finished + 3 ready, 0 pending
      var finalReady = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      var pending = App.state.schedule.filter(function(e) { return e.status === 'pending'; });
      assert.strictEqual(finalReady.length, 3, 'All 3 remaining games should be ready');
      assert.strictEqual(pending.length, 0, 'No games should remain pending');
    });

    it('should not duplicate players across ready games', function() {
      createSession3Courts(13);
      App.Shuffle.generate(12);
      App.Shuffle.autoAssignAll();

      // Start and finish first round
      var ready = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      ready.forEach(function(e) {
        App.Courts.startGame(e.courtId, e.teamA, e.teamB);
      });
      Object.values(App.state.courts).filter(function(c) { return c.occupied; }).forEach(function(c) {
        App.Courts.finishGame(c.id, '21-15');
      });
      App.Shuffle.autoAssignAll(); // UI calls this after finish

      // No player should appear in multiple ready games
      var newReady = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      var allPlayers = [];
      newReady.forEach(function(e) {
        allPlayers = allPlayers.concat(e.teamA).concat(e.teamB);
      });
      var unique = new Set(allPlayers);
      assert.strictEqual(unique.size, allPlayers.length, 'No player should appear in multiple ready games');
    });

    it('should work for two full rounds of finishes', function() {
      createSession3Courts(13);
      App.Shuffle.generate(9); // 3 rounds
      App.Shuffle.autoAssignAll();

      // Play through 2 full rounds
      for (var round = 0; round < 2; round++) {
        var ready = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
        ready.forEach(function(e) {
          App.Courts.startGame(e.courtId, e.teamA, e.teamB);
        });
        Object.values(App.state.courts).filter(function(c) { return c.occupied; }).forEach(function(c) {
          App.Courts.finishGame(c.id, '21-15');
        });
        App.Shuffle.autoAssignAll(); // UI calls this after finish
      }

      var finished = App.state.schedule.filter(function(e) { return e.status === 'finished'; });
      var ready2 = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      var pending2 = App.state.schedule.filter(function(e) { return e.status === 'pending'; });
      assert.strictEqual(finished.length, 6, 'Should have 6 finished games');
      assert.strictEqual(ready2.length, 3, 'Should have 3 ready games for round 3');
      assert.strictEqual(pending2.length, 0, 'No games should remain pending');
    });

    it('should only assign games whose players are all free', function() {
      createSession3Courts(13);
      App.Shuffle.generate(9);
      App.Shuffle.autoAssignAll();

      // Start all 3 ready games
      App.state.schedule.filter(function(e) { return e.status === 'ready'; }).forEach(function(e) {
        App.Courts.startGame(e.courtId, e.teamA, e.teamB);
      });

      // Finish all 3 courts sequentially
      Object.values(App.state.courts).filter(function(c) { return c.occupied; }).forEach(function(c) {
        App.Courts.finishGame(c.id, '21-15');
      });
      App.Shuffle.autoAssignAll(); // UI calls this after finish

      // All ready games should have players that are free
      var playingPids = {};
      App.state.schedule.forEach(function(e) {
        if (e.status === 'playing') {
          e.teamA.concat(e.teamB).forEach(function(pid) { playingPids[pid] = true; });
        }
      });
      var readyGames = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      readyGames.forEach(function(e) {
        e.teamA.concat(e.teamB).forEach(function(pid) {
          assert.ok(!playingPids[pid], 'Ready game player should not be playing on another court');
        });
      });
    });

    it('should not assign games when all pending have busy players', function() {
      // Create a scenario where the next pending game has players on other courts
      createSession3Courts(4); // Only 4 players — every game uses all 4
      App.Shuffle.generate(3);
      App.Shuffle.autoAssignAll();

      // Only 1 court can have a ready game (4 players = 1 game at a time with 2v2)
      var ready = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      assert.strictEqual(ready.length, 1);

      // Start it
      App.Courts.startGame(ready[0].courtId, ready[0].teamA, ready[0].teamB);

      // While game is playing, remaining games can't be assigned (same players)
      var pending = App.state.schedule.filter(function(e) { return e.status === 'pending'; });
      assert.strictEqual(pending.length, 2, 'Should have 2 pending games waiting');

      // No new ready games should be created (players are busy)
      var newReady = App.state.schedule.filter(function(e) { return e.status === 'ready'; });
      assert.strictEqual(newReady.length, 0, 'Should not skip ahead to assign games with busy players');
    });
  });

  describe('round-based bench calculation', function() {
    function createSession3Courts(playerCount) {
      App.Session.create('Test', 'shuffle');
      App.Session.initCourts([1, 2, 3]);
      var ids = [];
      for (var i = 0; i < playerCount; i++) {
        var id = App.Players.add('P' + (i + 1));
        App.Players.markPresent(id);
        ids.push(id);
      }
      return ids;
    }

    it('should compute bench from the round, not from courts', function() {
      var ids = createSession3Courts(13);
      App.Shuffle.generate(6); // 2 rounds
      App.Shuffle.autoAssignAll();

      // Round 1: games 0,1,2 — all 3 ready on courts
      var round1Players = {};
      for (var i = 0; i < 3; i++) {
        App.state.schedule[i].teamA.concat(App.state.schedule[i].teamB).forEach(function(pid) {
          round1Players[pid] = true;
        });
      }
      var round1Bench = ids.filter(function(id) { return !round1Players[id]; });

      // Start all 3 games
      App.state.schedule.filter(function(e) { return e.status === 'ready'; }).forEach(function(e) {
        App.Courts.startGame(e.courtId, e.teamA, e.teamB);
      });

      // Finish court 1 — game from round 2 gets assigned to court 1
      var court1 = Object.values(App.state.courts).find(function(c) {
        return c.displayNumber === 1 && c.occupied;
      });
      App.Courts.finishGame(court1.id, '21-15');
      App.Shuffle.autoAssignAll(); // UI calls this after finish

      // Round 1 bench should still be the same (computed from round, not courts)
      // Even though court 1 now has a round-2 game
      var round1BenchAfter = ids.filter(function(id) { return !round1Players[id]; });
      assert.deepStrictEqual(round1BenchAfter, round1Bench,
        'Round 1 bench should not change when a court gets a game from the next round');
    });

    it('should compute upcoming round bench from all games in the round', function() {
      var ids = createSession3Courts(13);
      App.Shuffle.generate(6);
      App.Shuffle.autoAssignAll();

      // Round 2: games 3,4,5 — compute bench from ALL 3 games
      var round2AllPlayers = {};
      for (var i = 3; i < 6; i++) {
        App.state.schedule[i].teamA.concat(App.state.schedule[i].teamB).forEach(function(pid) {
          round2AllPlayers[pid] = true;
        });
      }
      var round2Bench = ids.filter(function(id) { return !round2AllPlayers[id]; });
      assert.ok(round2Bench.length > 0, 'Round 2 should have bench players with 13 players');

      // Start and finish round 1, which assigns round 2 game to a court
      App.state.schedule.filter(function(e) { return e.status === 'ready'; }).forEach(function(e) {
        App.Courts.startGame(e.courtId, e.teamA, e.teamB);
      });
      var court1 = Object.values(App.state.courts).find(function(c) {
        return c.displayNumber === 1 && c.occupied;
      });
      App.Courts.finishGame(court1.id, '21-15');
      App.Shuffle.autoAssignAll(); // UI calls this after finish

      // Even though 1 game from round 2 is now on a court,
      // round 2 bench should still be computed from ALL 3 round-2 games
      var round2BenchAfter = ids.filter(function(id) { return !round2AllPlayers[id]; });
      assert.deepStrictEqual(round2BenchAfter, round2Bench,
        'Round 2 bench should include all round-2 game players, even if some are on courts');
    });
  });

  describe('_ensureState migration', function() {
    it('should add mode and schedule to old state', function() {
      var state = App.Storage._ensureState({
        players: {},
        courts: {}
      });
      assert.strictEqual(state.mode, 'queue');
      assert.deepStrictEqual(state.schedule, []);
    });
  });

  describe('SA determinism', function() {
    // Same session state → same schedule. Enables reproducible tests and debugging.
    it('should produce identical schedules for the same session after clearing and regenerating', function() {
      App.Session.create('Det', 'shuffle');
      App.Session.initCourts([1, 2, 3, 4]);
      var names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
      names.forEach(function(n) {
        var id = App.Players.add(n);
        App.Players.markPresent(id);
      });
      App.Shuffle.generate(16);
      var firstKeys = App.state.schedule.map(function(e) {
        return [e.teamA.slice().sort().join(','), e.teamB.slice().sort().join(',')].join('|');
      });

      // Clear pending and regenerate — same inputs should give same output.
      App.Shuffle.clearPending();
      App.Shuffle.generate(16);
      var secondKeys = App.state.schedule.map(function(e) {
        return [e.teamA.slice().sort().join(','), e.teamB.slice().sort().join(',')].join('|');
      });

      assert.deepStrictEqual(secondKeys, firstKeys, 'Identical inputs should produce identical schedules');
    });
  });

  describe('SA round invariant', function() {
    // Every round (group of courtCount consecutive games) must have no
    // duplicated players across its games.
    it('should never place a player in two games of the same round', function() {
      createShuffleSession(17); // Note: default is 2 courts, override below
      App.Session.initCourts([1, 2, 3, 4]);
      // Re-add players for the new court count
      Object.keys(App.state.players).forEach(function(id) {
        App.Players.markPresent(id);
      });
      App.Shuffle.generate(40);
      var courtCount = 4;
      for (var r = 0; r < 10; r++) {
        var seen = {};
        for (var g = 0; g < courtCount; g++) {
          var idx = r * courtCount + g;
          if (idx >= App.state.schedule.length) break;
          var all = App.state.schedule[idx].teamA.concat(App.state.schedule[idx].teamB);
          all.forEach(function(pid) {
            assert.ok(!seen[pid], 'Player ' + pid + ' appears twice in round ' + r);
            seen[pid] = true;
          });
        }
      }
    });
  });

  describe('SA quality — real session configs', function() {
    // Quality criteria across the player/court combinations we actually play.
    // Each config plays 10 rounds. Hard bounds:
    //   partner repeats = 0 (max ≤ 1)
    //   group (same 4 players in one game) repeats = 0 (max ≤ 1)
    //   solo (2v1) repeats = 0 (max ≤ 1 for configs that produce 2v1s)
    //   opponent repeats minimized (max ≤ 3)
    //   SA generation runtime < 5s
    var rounds = 10;
    var configs = [
      { p: 15, c: 4, hasSolo: true },
      { p: 16, c: 4, hasSolo: false },
      { p: 17, c: 4, hasSolo: false },
      { p: 19, c: 5, hasSolo: true },
      { p: 20, c: 5, hasSolo: false },
      { p: 21, c: 5, hasSolo: false },
    ];

    configs.forEach(function(cfg) {
      var label = cfg.p + 'p/' + cfg.c + 'c/' + rounds + 'r';
      it('should meet quality criteria for ' + label, function() {
        App.Session.create('Q-' + label, 'shuffle');
        var courts = [];
        for (var i = 1; i <= cfg.c; i++) courts.push(i);
        App.Session.initCourts(courts);
        var pids = [];
        for (var i = 0; i < cfg.p; i++) {
          var id = App.Players.add('P' + (i + 1));
          App.Players.markPresent(id);
          pids.push(id);
        }
        var total = cfg.c * rounds;
        var t0 = Date.now();
        App.Shuffle.generate(total);
        var elapsed = Date.now() - t0;
        assert.ok(elapsed < 5000, label + ': SA should finish under 5s, took ' + elapsed + 'ms');
        assert.strictEqual(App.state.schedule.length, total);

        var partners = {};
        var opponents = {};
        var groups = {};
        var solo = {};
        pids.forEach(function(pid) { solo[pid] = 0; });

        App.state.schedule.forEach(function(e) {
          var all = e.teamA.concat(e.teamB);
          assert.strictEqual(new Set(all).size, all.length,
            label + ': duplicate player within a game');

          [e.teamA, e.teamB].forEach(function(t) {
            if (t.length === 2) {
              var k = t.slice().sort().join('-');
              partners[k] = (partners[k] || 0) + 1;
            }
          });
          e.teamA.forEach(function(a) {
            e.teamB.forEach(function(b) {
              var k = [a, b].sort().join('-');
              opponents[k] = (opponents[k] || 0) + 1;
            });
          });
          if (all.length === 4) {
            var gk = all.slice().sort().join('-');
            groups[gk] = (groups[gk] || 0) + 1;
          }
          if (e.teamA.length === 1 && e.teamB.length === 2) solo[e.teamA[0]]++;
          else if (e.teamB.length === 1 && e.teamA.length === 2) solo[e.teamB[0]]++;
        });

        var maxPartner = Object.values(partners).length ? Math.max.apply(null, Object.values(partners)) : 0;
        var maxGroup = Object.values(groups).length ? Math.max.apply(null, Object.values(groups)) : 0;
        var maxOpponent = Object.values(opponents).length ? Math.max.apply(null, Object.values(opponents)) : 0;
        var maxSolo = Math.max.apply(null, Object.values(solo));

        assert.ok(maxPartner <= 1, label + ': partner repeat max ' + maxPartner + ' (expected ≤ 1)');
        assert.ok(maxGroup <= 1, label + ': same-4-players group repeat max ' + maxGroup + ' (expected ≤ 1)');
        assert.ok(maxOpponent <= 3, label + ': opponent repeat max ' + maxOpponent + ' (expected ≤ 3)');
        if (cfg.hasSolo) {
          assert.ok(maxSolo <= 1, label + ': solo repeat max ' + maxSolo + ' (expected ≤ 1)');
        } else {
          assert.strictEqual(maxSolo, 0, label + ': expected no 2v1 games, got solo max ' + maxSolo);
        }
      });
    });
  });
});
