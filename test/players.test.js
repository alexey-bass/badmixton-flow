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
});
