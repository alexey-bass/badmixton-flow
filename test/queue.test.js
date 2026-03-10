var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.Queue', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create();
    App.Session.initCourts([1]);
  });

  describe('add', function() {
    it('should add player to end of queue', function() {
      App.state.players = {
        p1: { gamesPlayed: 0 },
        p2: { gamesPlayed: 0 }
      };
      App.Queue.add('p1');
      App.Queue.add('p2');
      assert.deepStrictEqual(App.state.waitingQueue, ['p1', 'p2']);
    });

    it('should not add duplicate', function() {
      App.state.players = { p1: { gamesPlayed: 0 } };
      App.Queue.add('p1');
      App.Queue.add('p1');
      assert.deepStrictEqual(App.state.waitingQueue, ['p1']);
    });

    it('should insert new player before players who have played', function() {
      App.state.players = {
        p1: { gamesPlayed: 1 },
        p2: { gamesPlayed: 2 },
        p3: { gamesPlayed: 0 }
      };
      App.state.waitingQueue = ['p1', 'p2'];
      App.Queue.add('p3');
      assert.deepStrictEqual(App.state.waitingQueue, ['p3', 'p1', 'p2']);
    });

    it('should insert new player after other zero-games players', function() {
      App.state.players = {
        p1: { gamesPlayed: 0 },
        p2: { gamesPlayed: 1 },
        p3: { gamesPlayed: 0 }
      };
      App.state.waitingQueue = ['p1', 'p2'];
      App.Queue.add('p3');
      assert.deepStrictEqual(App.state.waitingQueue, ['p1', 'p3', 'p2']);
    });

    it('should add to end when all players have zero games', function() {
      App.state.players = {
        p1: { gamesPlayed: 0 },
        p2: { gamesPlayed: 0 },
        p3: { gamesPlayed: 0 }
      };
      App.state.waitingQueue = ['p1', 'p2'];
      App.Queue.add('p3');
      assert.deepStrictEqual(App.state.waitingQueue, ['p1', 'p2', 'p3']);
    });

    it('should add experienced player to end of queue', function() {
      App.state.players = {
        p1: { gamesPlayed: 0 },
        p2: { gamesPlayed: 1 }
      };
      App.state.waitingQueue = ['p1'];
      App.Queue.add('p2');
      assert.deepStrictEqual(App.state.waitingQueue, ['p1', 'p2']);
    });
  });

  describe('remove', function() {
    it('should remove player from queue', function() {
      App.Queue.add('p1');
      App.Queue.add('p2');
      App.Queue.remove('p1');
      assert.deepStrictEqual(App.state.waitingQueue, ['p2']);
    });

    it('should do nothing for non-existent player', function() {
      App.Queue.add('p1');
      App.Queue.remove('p99');
      assert.deepStrictEqual(App.state.waitingQueue, ['p1']);
    });
  });

  describe('move', function() {
    it('should move player to a new position', function() {
      App.state.waitingQueue = ['p1', 'p2', 'p3', 'p4'];
      App.Queue.move('p1', 2);
      assert.strictEqual(App.state.waitingQueue[2], 'p1');
    });
  });

  describe('moveToEnd', function() {
    it('should move player to end of queue', function() {
      App.state.waitingQueue = ['p1', 'p2', 'p3'];
      App.Queue.moveToEnd('p1');
      assert.deepStrictEqual(App.state.waitingQueue, ['p2', 'p3', 'p1']);
    });
  });

  describe('addMultipleToEnd', function() {
    it('should add multiple players to end', function() {
      App.state.waitingQueue = ['p1'];
      // Need to create player entries for queueEntryTime update
      App.state.players = {
        p1: { queueEntryTime: 0 },
        p2: { queueEntryTime: 0 },
        p3: { queueEntryTime: 0 }
      };
      App.Queue.addMultipleToEnd(['p2', 'p3']);
      assert.deepStrictEqual(App.state.waitingQueue, ['p1', 'p2', 'p3']);
    });

    it('should remove existing entries before re-adding', function() {
      App.state.waitingQueue = ['p1', 'p2', 'p3'];
      App.state.players = {
        p1: { queueEntryTime: 0 },
        p2: { queueEntryTime: 0 },
        p3: { queueEntryTime: 0 }
      };
      App.Queue.addMultipleToEnd(['p1', 'p2']);
      assert.deepStrictEqual(App.state.waitingQueue, ['p3', 'p1', 'p2']);
    });
  });

  describe('getPosition', function() {
    it('should return index of player in queue', function() {
      App.state.waitingQueue = ['p1', 'p2', 'p3'];
      assert.strictEqual(App.Queue.getPosition('p2'), 1);
    });

    it('should return -1 for player not in queue', function() {
      App.state.waitingQueue = ['p1'];
      assert.strictEqual(App.Queue.getPosition('p99'), -1);
    });
  });
});
