/**
 * Auto-capture screenshots of each tab for README.
 * Uses Playwright with Chromium.
 *
 * Usage: npm run screenshots
 *
 * Starts a local server, navigates to each tab,
 * seeds demo data, and saves PNGs to screenshots/.
 */

var { chromium } = require('playwright');
var { execSync, spawn } = require('child_process');
var path = require('path');

var VIEWPORT = { width: 768, height: 1024 };
var BASE_URL = 'http://localhost:8090';
var OUT_DIR = path.join(__dirname, '..', 'screenshots');

// Tabs to capture: [filename, tabName, needsAdmin]
var TABS = [
  ['01-board', 'board', false],
  ['02-players', 'players', true],
  ['03-results', 'results', false],
  ['04-queue', 'queue', true],
  ['05-courts', 'courts', true],
  ['06-session', 'dashboard', true],
  ['07-history', 'history', true],
  ['08-help', null, false]
];

async function seedDemoData(page) {
  await page.evaluate(function() {
    // Create session
    App.Session.create();
    App.Session.initCourts([1, 2, 3]);

    // Add players
    var names = ['Anna', 'Bartek', 'Celina', 'Damian', 'Ewa', 'Filip',
                 'Gosia', 'Hubert', 'Iza', 'Jakub', 'Kasia', 'Lena'];
    var ids = [];
    names.forEach(function(name) {
      var id = App.Players.add(name);
      App.Players.markPresent(id);
      ids.push(id);
    });

    // Simulate some finished matches with scores
    var now = Date.now();
    var matchData = [
      { teamA: [ids[0], ids[1]], teamB: [ids[2], ids[3]], score: '21-15', time: now - 3600000 },
      { teamA: [ids[4], ids[5]], teamB: [ids[6], ids[7]], score: '18-21', time: now - 3000000 },
      { teamA: [ids[0], ids[4]], teamB: [ids[1], ids[5]], score: '21-19', time: now - 2400000 },
      { teamA: [ids[2], ids[6]], teamB: [ids[3], ids[7]], score: '15-21', time: now - 1800000 },
      { teamA: [ids[8], ids[9]], teamB: [ids[10], ids[11]], score: '21-17', time: now - 1200000 }
    ];

    matchData.forEach(function(m) {
      var matchId = App.Utils.generateId('m');
      App.state.matches[matchId] = {
        id: matchId,
        teamA: m.teamA,
        teamB: m.teamB,
        score: m.score,
        status: 'finished',
        startTime: m.time - 600000,
        endTime: m.time,
        courtId: 'court_1'
      };

      // Update player stats
      var parts = m.score.split('-').map(Number);
      var winners = parts[0] > parts[1] ? m.teamA : m.teamB;
      var losers = parts[0] > parts[1] ? m.teamB : m.teamA;
      m.teamA.concat(m.teamB).forEach(function(pid) {
        var p = App.state.players[pid];
        p.gamesPlayed++;
        p.lastGameEndTime = m.time;
      });
      winners.forEach(function(pid) {
        App.state.players[pid].wins++;
        App.state.players[pid].pointsScored += parts[0] > parts[1] ? parts[0] : parts[1];
        App.state.players[pid].pointsConceded += parts[0] > parts[1] ? parts[1] : parts[0];
      });
      losers.forEach(function(pid) {
        App.state.players[pid].losses++;
        App.state.players[pid].pointsScored += parts[0] > parts[1] ? parts[1] : parts[0];
        App.state.players[pid].pointsConceded += parts[0] > parts[1] ? parts[0] : parts[1];
      });

      // Update partner/opponent history
      m.teamA.forEach(function(pid) {
        var partner = m.teamA[0] === pid ? m.teamA[1] : m.teamA[0];
        App.state.players[pid].partnerHistory[partner] = (App.state.players[pid].partnerHistory[partner] || 0) + 1;
        m.teamB.forEach(function(opp) {
          App.state.players[pid].opponentHistory[opp] = (App.state.players[pid].opponentHistory[opp] || 0) + 1;
        });
      });
      m.teamB.forEach(function(pid) {
        var partner = m.teamB[0] === pid ? m.teamB[1] : m.teamB[0];
        App.state.players[pid].partnerHistory[partner] = (App.state.players[pid].partnerHistory[partner] || 0) + 1;
        m.teamA.forEach(function(opp) {
          App.state.players[pid].opponentHistory[opp] = (App.state.players[pid].opponentHistory[opp] || 0) + 1;
        });
      });
    });

    // Put an active game on court 1
    var court1Key = Object.keys(App.state.courts)[0];
    var court1 = App.state.courts[court1Key];
    court1.occupied = true;
    court1.gameStartTime = now - 420000; // 7 min ago
    court1.currentMatch = {
      teamA: [ids[0], ids[2]],
      teamB: [ids[5], ids[7]]
    };
    // Remove those players from queue
    [ids[0], ids[2], ids[5], ids[7]].forEach(function(pid) {
      App.Queue.remove(pid);
    });

    App.save();
    App.UI.renderAll();
  });
}

async function main() {
  // Start local server
  var server = spawn('python3', ['-m', 'http.server', '8090'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore'
  });

  // Wait for server to start
  await new Promise(function(resolve) { setTimeout(resolve, 1000); });

  var browser, exitCode = 0;
  try {
    browser = await chromium.launch();
    var context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2
    });
    var page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Set admin mode and seed data
    await page.evaluate(function() {
      localStorage.setItem('badminton_mode', 'admin');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await seedDemoData(page);

    // Capture each tab
    for (var i = 0; i < TABS.length; i++) {
      var tab = TABS[i];
      var filename = tab[0];
      var tabName = tab[1];
      var needsAdmin = tab[2];

      // Set mode
      if (needsAdmin) {
        await page.evaluate(function() {
          localStorage.setItem('badminton_mode', 'admin');
          document.getElementById('tabNav').classList.remove('player-mode');
          document.body.classList.remove('player-mode');
        });
      } else {
        await page.evaluate(function() {
          localStorage.setItem('badminton_mode', 'player');
          document.getElementById('tabNav').classList.add('player-mode');
          document.body.classList.add('player-mode');
        });
      }

      if (tabName === null) {
        // Special case: help modal
        await page.evaluate(function() {
          document.getElementById('btnHelp').click();
        });
        await new Promise(function(resolve) { setTimeout(resolve, 500); });

        var filePath = path.join(OUT_DIR, filename + '.png');
        await page.screenshot({ path: filePath, fullPage: false });
        console.log('Saved: ' + filePath);

        // Close modal
        await page.evaluate(function() {
          var modal = document.getElementById('helpModal');
          if (modal) modal.style.display = 'none';
        });
      } else {
        // Switch tab
        await page.evaluate(function(t) { App.UI.showTab(t); }, tabName);
        await new Promise(function(resolve) { setTimeout(resolve, 500); });

        var filePath = path.join(OUT_DIR, filename + '.png');
        await page.screenshot({ path: filePath, fullPage: true });
        console.log('Saved: ' + filePath);
      }
    }

    console.log('\nAll screenshots captured successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
    process.exit(exitCode);
  }
}

main();
