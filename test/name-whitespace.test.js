var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();

describe('Player name whitespace normalisation (#101)', function() {
  beforeEach(function() {
    localStorage.clear();
    App.Session.create('Test', 'queue');
    App.Session.initCourts([1]);
  });

  it('add collapses inner whitespace and trims', function() {
    var id = App.Players.add('  Ola \t  Z  ');
    assert.strictEqual(App.state.players[id].name, 'Ola Z');
  });

  it('rename collapses inner whitespace', function() {
    var id = App.Players.add('Ola');
    App.Players.rename(id, 'Ola   Zet');
    assert.strictEqual(App.state.players[id].name, 'Ola Zet');
  });

  it('duplicate check treats double-spaced and stored-with-spaces names as the same', function() {
    App.Players.add('Ola Z');
    assert.strictEqual(App.UI._hasNameDuplicate('Ola  Z'), true);
    assert.strictEqual(App.UI._hasNameDuplicate('ola\tz'), true);
    // legacy stored name with inner spaces still matches a clean input
    var id = App.Players.add('Marek K');
    App.state.players[id].name = 'Marek   K';
    assert.strictEqual(App.UI._hasNameDuplicate('Marek K'), true);
  });

  it('bulk add skips the double-spaced variant instead of adding a second player', function() {
    App.UI.showModal = function(html) { document.getElementById('modalContent').innerHTML = html; };
    var fns = [];
    document.getElementById('btnBulkAddSubmit').addEventListener = function(t, fn) { fns.push(fn); };
    var toasts = [];
    var origToast = App.UI.showToast;
    App.UI.showToast = function(m) { toasts.push(m); };

    App.UI._showBulkAddDialog();
    document.getElementById('bulkAddTextarea').value = 'Ola Z\nola z\nOla  Z\n Ola Z \nAleks';
    document.getElementById('bulkAddShorten').checked = false;
    document.getElementById('bulkAddPresent').checked = true;
    fns[0]();
    App.UI.showToast = origToast;

    var names = Object.values(App.state.players).map(function(p) { return p.name; }).sort();
    assert.deepStrictEqual(names, ['Aleks', 'Ola Z']);
    assert.strictEqual(toasts.length, 1);
    assert.ok(toasts[0].indexOf('2') === 0, 'two added');
    assert.ok(toasts[0].indexOf('3') !== -1, 'three skipped');
  });
});
