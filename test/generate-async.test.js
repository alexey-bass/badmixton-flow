var { describe, it, beforeEach } = require('node:test');
var assert = require('node:assert');
var { loadApp } = require('./helpers');

var App = loadApp();
App.UI.showModal = function(html) { document.getElementById('modalContent').innerHTML = html; document.getElementById('modalOverlay').hidden = false; };

function createShuffle(n, courts) {
  App.Session.create('Test', 'shuffle');
  App.Session.initCourts(courts);
  for (var i = 0; i < n; i++) App.Players.markPresent(App.Players.add('P' + (i + 1)));
}
function teams() { return JSON.stringify(App.state.schedule.map(function(e) { return [e.teamA, e.teamB, e.round, e.bench]; })); }
function generateAsyncP(count, onProgress) {
  return new Promise(function(resolve) {
    var started = App.Shuffle.generateAsync(count, null, onProgress, resolve);
    if (started === false) resolve(0);
  });
}
function settle() { return new Promise(function(r) { setTimeout(r, 0); }); }

describe('Chunked schedule generation (#96)', function() {
  beforeEach(function() { localStorage.clear(); App.Shuffle.generating = false; });

  it('produces exactly the same schedule as the synchronous generate()', async function() {
    createShuffle(17, [1, 2, 3, 4]);
    App.Shuffle.generate(8);
    var sync = teams();
    App.state.schedule = []; // same players, same count, same (empty) schedule → same seed
    var generated = await generateAsyncP(8);
    assert.strictEqual(generated, 8);
    assert.strictEqual(teams(), sync);
  });

  it('reports monotonic progress ending at 1 and clears the generating flag', async function() {
    createShuffle(40, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    var progress = [];
    var p = generateAsyncP(10, function(f) { progress.push(f); });
    assert.strictEqual(App.Shuffle.generating, true, 'flag set synchronously');
    await p;
    assert.strictEqual(App.Shuffle.generating, false);
    assert.strictEqual(progress[0], 0);
    assert.strictEqual(progress[progress.length - 1], 1);
    for (var i = 1; i < progress.length; i++) assert.ok(progress[i] >= progress[i - 1], 'monotonic');
    assert.ok(progress.length >= 3, '40 players / 10 courts needs several slices, got ' + progress.length);
    assert.strictEqual(App.state.schedule.length, 10);
  });

  it('refuses a second generation while one is running', async function() {
    createShuffle(13, [1, 2, 3, 4]);
    var toasts = [];
    var orig = App.UI.showToast;
    App.UI.showToast = function(m) { toasts.push(m); };
    var first = generateAsyncP(3);
    var second = App.Shuffle.generateAsync(3, null, null, null);
    assert.strictEqual(second, false);
    assert.ok(toasts.indexOf(App.t('scheduleGenerationBusy')) !== -1);
    await first;
    App.UI.showToast = orig;
    assert.strictEqual(App.state.schedule.length, 3, 'only the first generation committed');
  });

  it('reshuffleAsync regenerates the removed rounds with a new draw', async function() {
    createShuffle(13, [1, 2, 3, 4]);
    App.Shuffle.generateRounds(2);
    var before = teams();
    await new Promise(function(resolve) { App.Shuffle.reshuffleAsync(null, resolve); });
    assert.strictEqual(App.state.schedule.length, 6);
    assert.notStrictEqual(teams(), before);
  });

  it('the Schedule-tab button shows a progress modal, then hides it and assigns courts', async function() {
    createShuffle(13, [1, 2, 3, 4]);
    var handlers = [];
    App.UI._bindScheduleActions({ addEventListener: function(t, fn) { handlers.push(fn); } });
    var btn = { dataset: { action: 'schedule-generate', rounds: '2' } };
    handlers[0]({ target: { closest: function() { return btn; } } });

    assert.ok(document.getElementById('modalContent').innerHTML.indexOf(App.t('scheduleGenerating')) !== -1, 'progress modal shown');
    while (App.Shuffle.generating) await settle();
    await settle();
    assert.strictEqual(document.getElementById('modalOverlay').hidden, true, 'modal hidden when done');
    assert.strictEqual(App.state.schedule.length, 6);
    assert.strictEqual(App.state.schedule.filter(function(e) { return e.status === 'ready'; }).length, 3, 'auto-assigned to the 3 usable courts');
  });
});
