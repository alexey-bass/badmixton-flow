var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.Players', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1, 2]);
  });

  describe('add', function() {
    it('should add a player and return id', function() {
      var id = App.Players.add('Alice');
      assert.ok(id);
      assert.ok(id.startsWith('p_'));
      assert.strictEqual(App.state.players[id].name, 'Alice');
    });

    it('should initialize all player fields', function() {
      var id = App.Players.add('Bob');
      var p = App.state.players[id];
      assert.strictEqual(p.present, false);
      assert.strictEqual(p.gamesPlayed, 0);
      assert.strictEqual(p.wins, 0);
      assert.strictEqual(p.losses, 0);
      assert.strictEqual(p.pointsScored, 0);
      assert.strictEqual(p.pointsConceded, 0);
      assert.deepStrictEqual(p.partnerHistory, {});
      assert.deepStrictEqual(p.opponentHistory, {});
      assert.deepStrictEqual(p.wishedPartners, []);
      assert.deepStrictEqual(p.wishesFulfilled, []);
    });

    it('should return null for empty name', function() {
      assert.strictEqual(App.Players.add(''), null);
      assert.strictEqual(App.Players.add('   '), null);
      assert.strictEqual(App.Players.add(null), null);
    });

    it('should trim whitespace', function() {
      var id = App.Players.add('  Carol  ');
      assert.strictEqual(App.state.players[id].name, 'Carol');
    });
  });

  describe('remove', function() {
    it('should remove a player', function() {
      var id = App.Players.add('Alice');
      App.Players.remove(id);
      assert.strictEqual(App.state.players[id], undefined);
    });

    it('should remove player from queue', function() {
      var id = App.Players.add('Alice');
      App.Players.markPresent(id);
      assert.ok(App.state.waitingQueue.includes(id));

      App.Players.remove(id);
      assert.ok(!App.state.waitingQueue.includes(id));
    });
  });

  describe('removeAll', function() {
    it('should remove all players', function() {
      App.Players.add('Alice');
      App.Players.add('Bob');
      App.Players.add('Carol');
      var removed = App.Players.removeAll();
      assert.strictEqual(removed, 3);
      assert.strictEqual(Object.keys(App.state.players).length, 0);
    });

    it('should not remove players on court', function() {
      var ids = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'].map(function(n) { return App.Players.add(n); });
      ids.forEach(function(id) { App.Players.markPresent(id); });
      var courtId = Object.keys(App.state.courts)[0];
      App.Courts.startGame(courtId, [ids[0], ids[1]], [ids[2], ids[3]]);

      var removed = App.Players.removeAll();
      assert.strictEqual(removed, 1); // only Eve removed
      assert.ok(App.state.players[ids[0]]); // on court, kept
      assert.ok(App.state.players[ids[1]]); // on court, kept
      assert.ok(App.state.players[ids[2]]); // on court, kept
      assert.ok(App.state.players[ids[3]]); // on court, kept
      assert.strictEqual(App.state.players[ids[4]], undefined); // removed
    });

    it('should remove players from queue', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      App.Players.markPresent(id1);
      App.Players.markPresent(id2);
      assert.strictEqual(App.state.waitingQueue.length, 2);

      App.Players.removeAll();
      assert.strictEqual(App.state.waitingQueue.length, 0);
    });

    it('should clean up wishes targeting removed players', function() {
      var ids = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'].map(function(n) { return App.Players.add(n); });
      ids.forEach(function(id) { App.Players.markPresent(id); });
      // Alice wishes for Eve
      App.Players.setWish(ids[0], ids[4]);
      // Put Alice, Bob, Carol, Dave on court
      var courtId = Object.keys(App.state.courts)[0];
      App.Courts.startGame(courtId, [ids[0], ids[1]], [ids[2], ids[3]]);

      // removeAll removes Eve (not on court)
      App.Players.removeAll();
      // Alice's wish for Eve should be cleaned up
      assert.deepStrictEqual(App.state.players[ids[0]].wishedPartners, []);
    });

    it('should return 0 when no players to remove', function() {
      var removed = App.Players.removeAll();
      assert.strictEqual(removed, 0);
    });
  });

  describe('markPresent', function() {
    it('should mark player as present and add to queue', function() {
      var id = App.Players.add('Alice');
      App.Players.markPresent(id);

      assert.strictEqual(App.state.players[id].present, true);
      assert.ok(App.state.players[id].number > 0);
      assert.ok(App.state.waitingQueue.includes(id));
    });

    it('should assign sequential numbers', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      App.Players.markPresent(id1);
      App.Players.markPresent(id2);

      assert.strictEqual(App.state.players[id1].number, 1);
      assert.strictEqual(App.state.players[id2].number, 2);
    });
  });

  describe('markAbsent', function() {
    it('should mark player as absent and remove from queue', function() {
      var id = App.Players.add('Alice');
      App.Players.markPresent(id);
      App.Players.markAbsent(id);

      assert.strictEqual(App.state.players[id].present, false);
      assert.ok(!App.state.waitingQueue.includes(id));
    });
  });

  describe('setWish', function() {
    it('should add a wished partner', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      App.Players.setWish(id1, id2);

      assert.deepStrictEqual(App.state.players[id1].wishedPartners, [id2]);
    });

    it('should support multiple wished partners', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      var id3 = App.Players.add('Carol');
      App.Players.setWish(id1, id2);
      App.Players.setWish(id1, id3);

      assert.deepStrictEqual(App.state.players[id1].wishedPartners, [id2, id3]);
    });

    it('should toggle wish off when called again with same partner', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      App.Players.setWish(id1, id2);
      App.Players.setWish(id1, id2);

      assert.deepStrictEqual(App.state.players[id1].wishedPartners, []);
    });

    it('should clear all wishes with null', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      var id3 = App.Players.add('Carol');
      App.Players.setWish(id1, id2);
      App.Players.setWish(id1, id3);
      App.Players.setWish(id1, null);

      assert.deepStrictEqual(App.state.players[id1].wishedPartners, []);
    });
  });

  describe('rename', function() {
    it('should rename a player', function() {
      var id = App.Players.add('Alice');
      var result = App.Players.rename(id, 'Alicia');
      assert.strictEqual(result, true);
      assert.strictEqual(App.state.players[id].name, 'Alicia');
    });

    it('should trim whitespace', function() {
      var id = App.Players.add('Alice');
      App.Players.rename(id, '  Bob  ');
      assert.strictEqual(App.state.players[id].name, 'Bob');
    });

    it('should return false for empty name', function() {
      var id = App.Players.add('Alice');
      assert.strictEqual(App.Players.rename(id, ''), false);
      assert.strictEqual(App.Players.rename(id, '   '), false);
      assert.strictEqual(App.Players.rename(id, null), false);
      assert.strictEqual(App.state.players[id].name, 'Alice');
    });

    it('should return false for non-existent player', function() {
      assert.strictEqual(App.Players.rename('fake_id', 'Test'), false);
    });

    it('should preserve all other player fields', function() {
      var id = App.Players.add('Alice');
      App.Players.markPresent(id);
      var before = Object.assign({}, App.state.players[id]);
      App.Players.rename(id, 'Alicia');
      var after = App.state.players[id];
      assert.strictEqual(after.name, 'Alicia');
      assert.strictEqual(after.number, before.number);
      assert.strictEqual(after.present, before.present);
      assert.strictEqual(after.gamesPlayed, before.gamesPlayed);
    });
  });

  describe('renumber', function() {
    it('should renumber present players sequentially', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      var id3 = App.Players.add('Carol');
      App.Players.markPresent(id1); // #1
      App.Players.markPresent(id2); // #2
      App.Players.markPresent(id3); // #3
      App.Players.markAbsent(id2);  // remove Bob
      // Alice=#1, Carol=#3 — gap at #2
      App.Players.renumber();
      assert.strictEqual(App.state.players[id1].number, 1);
      assert.strictEqual(App.state.players[id3].number, 2);
      assert.strictEqual(App.state.nextPlayerNumber, 3);
    });

    it('should preserve original order', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      App.Players.markPresent(id2); // #1
      App.Players.markPresent(id1); // #2
      App.Players.renumber();
      assert.strictEqual(App.state.players[id2].number, 1);
      assert.strictEqual(App.state.players[id1].number, 2);
    });

    it('should handle no present players', function() {
      App.Players.add('Alice');
      App.Players.renumber();
      assert.strictEqual(App.state.nextPlayerNumber, 1);
    });

    it('should reset absent players numbers to 0', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      App.Players.markPresent(id1); // #1
      App.Players.markPresent(id2); // #2
      App.Players.markAbsent(id1);  // Alice leaves
      assert.strictEqual(App.state.players[id1].number, 1); // stale number
      App.Players.renumber();
      assert.strictEqual(App.state.players[id1].number, 0); // reset
      assert.strictEqual(App.state.players[id2].number, 1); // renumbered
    });
  });

  describe('bulk add (core logic)', function() {
    it('should add multiple players at once', function() {
      var names = ['Alice', 'Bob', 'Carol'];
      var ids = names.map(function(name) { return App.Players.add(name); });
      ids.forEach(function(id) { assert.ok(id); });
      assert.strictEqual(Object.keys(App.state.players).length, 3);
    });

    it('should mark all as present when requested', function() {
      var names = ['Alice', 'Bob', 'Carol'];
      var ids = names.map(function(name) {
        var id = App.Players.add(name);
        App.Players.markPresent(id);
        return id;
      });
      ids.forEach(function(id) {
        assert.strictEqual(App.state.players[id].present, true);
      });
      assert.strictEqual(App.state.waitingQueue.length, 3);
    });

    it('should skip duplicate names', function() {
      App.Players.add('Alice');
      var existingNames = {};
      Object.keys(App.state.players).forEach(function(id) {
        existingNames[App.state.players[id].name.toLowerCase()] = true;
      });
      var names = ['Alice', 'Bob', 'alice'];
      var added = 0;
      names.forEach(function(name) {
        if (!existingNames[name.toLowerCase()]) {
          App.Players.add(name);
          existingNames[name.toLowerCase()] = true;
          added++;
        }
      });
      assert.strictEqual(added, 1); // only Bob
      assert.strictEqual(Object.keys(App.state.players).length, 2);
    });

    it('should shorten "LastName FirstName" to "FirstName L"', function() {
      assert.strictEqual(App.UI._shortenName('Kowalski Jan'), 'Jan K');
      assert.strictEqual(App.UI._shortenName('Nowak Anna'), 'Anna N');
    });

    it('should not shorten single-word names', function() {
      assert.strictEqual(App.UI._shortenName('Ola'), 'Ola');
    });

    it('should handle multi-part first names', function() {
      assert.strictEqual(App.UI._shortenName('Kowalski Jan Maria'), 'Jan Maria K');
    });

    it('should skip empty lines', function() {
      var text = 'Alice\n\n  \nBob\n';
      var names = text.split(/\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
      assert.deepStrictEqual(names, ['Alice', 'Bob']);
    });
  });

  describe('getPresent', function() {
    it('should return only present players', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      App.Players.markPresent(id1);

      var present = App.Players.getPresent();
      assert.strictEqual(present.length, 1);
      assert.strictEqual(present[0].name, 'Alice');
    });
  });

  describe('isOnCourt', function() {
    it('should return false for player not on court', function() {
      var id = App.Players.add('Alice');
      assert.strictEqual(App.Players.isOnCourt(id), false);
    });
  });

  describe('getCourtId', function() {
    it('should return null for player not on court', function() {
      var id = App.Players.add('Alice');
      App.Players.markPresent(id);
      assert.strictEqual(App.Players.getCourtId(id), null);
    });

    it('should return courtId for player on court', function() {
      var ids = ['Alice', 'Bob', 'Carol', 'Dave'].map(function(name) {
        var id = App.Players.add(name);
        App.Players.markPresent(id);
        return id;
      });
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);

      assert.strictEqual(App.Players.getCourtId(ids[0]), 'c_1');
      assert.strictEqual(App.Players.getCourtId(ids[2]), 'c_1');
    });

    it('should return null after game finishes', function() {
      var ids = ['Alice', 'Bob', 'Carol', 'Dave'].map(function(name) {
        var id = App.Players.add(name);
        App.Players.markPresent(id);
        return id;
      });
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      App.Courts.finishGame('c_1');

      assert.strictEqual(App.Players.getCourtId(ids[0]), null);
    });
  });

  describe('getStatus', function() {
    it('should return "absent" for absent player', function() {
      var id = App.Players.add('Alice');
      assert.strictEqual(App.Players.getStatus(id), 'absent');
    });

    it('should return "waiting" for player in queue', function() {
      var id = App.Players.add('Alice');
      App.Players.markPresent(id);
      assert.strictEqual(App.Players.getStatus(id), 'waiting');
    });

    it('should return "playing" for player on court', function() {
      var ids = ['Alice', 'Bob', 'Carol', 'Dave'].map(function(name) {
        var id = App.Players.add(name);
        App.Players.markPresent(id);
        return id;
      });
      App.Courts.startGame('c_1', [ids[0], ids[1]], [ids[2], ids[3]]);
      assert.strictEqual(App.Players.getStatus(ids[0]), 'playing');
    });

    it('should return "present" for present player not in queue and not on court', function() {
      var id = App.Players.add('Alice');
      App.Players.markPresent(id);
      // Remove from queue manually
      App.Queue.remove(id);
      assert.strictEqual(App.Players.getStatus(id), 'present');
    });

    it('should return "absent" for non-existent player', function() {
      assert.strictEqual(App.Players.getStatus('fake_id'), 'absent');
    });
  });

  describe('getSorted', function() {
    it('should return present players before absent', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      App.Players.markPresent(id1);

      var sorted = App.Players.getSorted();
      assert.strictEqual(sorted.length, 2);
      assert.strictEqual(sorted[0].present, true);
      assert.strictEqual(sorted[1].present, false);
    });

    it('should sort present players by number', function() {
      var id1 = App.Players.add('Alice');
      var id2 = App.Players.add('Bob');
      var id3 = App.Players.add('Carol');
      App.Players.markPresent(id3); // #1
      App.Players.markPresent(id1); // #2
      App.Players.markPresent(id2); // #3

      var sorted = App.Players.getSorted();
      assert.strictEqual(sorted[0].name, 'Carol');
      assert.strictEqual(sorted[1].name, 'Alice');
      assert.strictEqual(sorted[2].name, 'Bob');
    });

    it('should sort absent players by name', function() {
      App.Players.add('Carol');
      App.Players.add('Alice');
      App.Players.add('Bob');

      var sorted = App.Players.getSorted();
      assert.strictEqual(sorted[0].name, 'Alice');
      assert.strictEqual(sorted[1].name, 'Bob');
      assert.strictEqual(sorted[2].name, 'Carol');
    });

    it('should return empty array when no players', function() {
      assert.deepStrictEqual(App.Players.getSorted(), []);
    });
  });
});
