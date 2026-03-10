var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('App.Storage', function() {
  beforeEach(function() {
    localStorage.clear();
  });

  describe('save and load', function() {
    it('should save and load session state', function() {
      App.Session.create();
      App.Storage.save();

      var loaded = App.Storage.load(App.state.date);
      assert.ok(loaded);
      assert.strictEqual(loaded.date, App.state.date);
      assert.deepStrictEqual(loaded.players, {});
    });

    it('should return null for non-existent date', function() {
      var loaded = App.Storage.load('2020-01-01');
      assert.strictEqual(loaded, null);
    });
  });

  describe('_ensureState', function() {
    it('should return null for invalid input', function() {
      assert.strictEqual(App.Storage._ensureState(null), null);
      assert.strictEqual(App.Storage._ensureState('string'), null);
    });

    it('should fill missing fields', function() {
      var state = App.Storage._ensureState({ players: { p1: { name: 'Test' } } });
      assert.ok(Array.isArray(state.waitingQueue));
      assert.ok(typeof state.courts === 'object');
      assert.ok(typeof state.matches === 'object');
      assert.ok(typeof state.settings === 'object');
      assert.strictEqual(state.nextPlayerNumber, 1);
      assert.strictEqual(state.isAdmin, true);
    });

    it('should migrate player fields', function() {
      var state = App.Storage._ensureState({
        players: { p1: { name: 'Test' } },
        courts: {}
      });
      var p = state.players.p1;
      assert.deepStrictEqual(p.partnerHistory, {});
      assert.deepStrictEqual(p.opponentHistory, {});
      assert.strictEqual(p.wins, 0);
      assert.strictEqual(p.losses, 0);
      assert.strictEqual(p.pointsScored, 0);
      assert.strictEqual(p.pointsConceded, 0);
    });

    it('should not overwrite existing fields', function() {
      var state = App.Storage._ensureState({
        players: {},
        waitingQueue: ['a', 'b'],
        courts: { c1: {} },
        matches: {},
        settings: { courtNumbers: [1, 2] },
        nextPlayerNumber: 5,
        date: '2026-01-01'
      });
      assert.deepStrictEqual(state.waitingQueue, ['a', 'b']);
      assert.strictEqual(state.nextPlayerNumber, 5);
      assert.strictEqual(state.date, '2026-01-01');
    });
  });

  describe('getIndex', function() {
    it('should return empty array when no index exists', function() {
      assert.deepStrictEqual(App.Storage.getIndex(), []);
    });

    it('should track saved sessions in index', function() {
      App.Session.create();
      App.Storage.save();
      var index = App.Storage.getIndex();
      assert.ok(index.includes(App.state.date));
    });
  });
});
