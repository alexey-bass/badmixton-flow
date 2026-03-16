/**
 * Capture a screenshot of the printed schedule page.
 * Seeds a shuffle session with 13 players / 3 courts, generates 11 rounds,
 * opens the print view, and saves a PNG.
 *
 * Usage: npm run screenshot:print
 */

var { chromium } = require('playwright');
var { execSync, spawn } = require('child_process');
var path = require('path');

var PORT = 8090;
var BASE_URL = 'http://localhost:' + PORT;
var OUT_DIR = path.join(__dirname, '..', 'screenshots');
var OUT_FILE = path.join(OUT_DIR, '09-print-schedule.png');

async function main() {
  var server = spawn('python3', ['-m', 'http.server', String(PORT)], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore'
  });

  await new Promise(function(resolve) { setTimeout(resolve, 1000); });

  var browser, exitCode = 0;
  try {
    browser = await chromium.launch();
    var context = await browser.newContext({
      viewport: { width: 794, height: 1123 }, // A4 at 96dpi
      deviceScaleFactor: 2
    });
    var page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Set admin mode
    await page.evaluate(function() {
      localStorage.setItem('badminton_mode', 'admin');
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Seed shuffle session: 13 players, 3 courts, generate enough games for 11 rounds
    await page.evaluate(function() {
      App.Session.create('Czwartkowy trening', 'shuffle');
      App.Session.initCourts([1, 2, 3]);

      var names = ['Ola', 'Kasia', 'Tomek', 'Bartek', 'Magda', 'Ania',
                   'Piotr', 'Zosia', 'Marek', 'Ewa', 'Kamil', 'Natalia', 'Dawid'];
      names.forEach(function(name) {
        var id = App.Players.add(name);
        App.Players.markPresent(id);
      });

      // Generate games — 11 rounds × 3 courts = 33 games
      while (App.state.schedule.length < 33) {
        App.Shuffle.generate(3);
      }
      // Trim to exactly 33
      App.state.schedule = App.state.schedule.slice(0, 33);

      App.save();
      App.UI.renderAll();
    });

    // Intercept popup — capture it instead
    var printPage = await context.waitForEvent('page', {
      predicate: function() { return true; },
      timeout: 10000
    }.timeout, Promise.all([
      // Click print button
      page.evaluate(function() {
        App.UI.showTab('queue'); // Schedule tab in shuffle mode
      })
    ])).catch(function() { return null; });

    // Use page.evaluate to get the print HTML, then open it in a new page
    var printHtml = await page.evaluate(function() {
      var state = App.state;
      var schedule = state.schedule;
      if (!schedule || schedule.length === 0) return null;
      // Call printSchedule but intercept the window.open
      var html = '';
      var origOpen = window.open;
      window.open = function() {
        var doc = { _html: '', write: function(h) { this._html += h; }, close: function() {} };
        html = doc;
        return { document: doc, focus: function() {}, print: function() {} };
      };
      App.UI.printSchedule();
      window.open = origOpen;
      return html._html;
    });

    if (!printHtml) {
      throw new Error('Failed to generate print HTML');
    }

    // Open print HTML in a new page and screenshot
    var printPage = await context.newPage();
    await printPage.setContent(printHtml, { waitUntil: 'networkidle' });
    await new Promise(function(resolve) { setTimeout(resolve, 500); });

    await printPage.screenshot({ path: OUT_FILE, fullPage: true });
    console.log('Saved: ' + OUT_FILE);

    // Optimize with pngquant
    try {
      execSync('pngquant --version', { stdio: 'ignore' });
      execSync('pngquant --force --quality=65-90 --skip-if-larger --ext .png "' + OUT_FILE + '"',
        { stdio: 'inherit' });
      console.log('PNG optimized with pngquant.');
    } catch (e) {
      console.log('pngquant not found — skipping optimization.');
    }

    console.log('Done!');
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
