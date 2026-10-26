/**
 * Run Lighthouse audit on the app.
 * Runs the lighthouse CLI against a local server.
 *
 * Usage: npm run lighthouse
 *
 * Outputs scores to console and saves full report to reports/lighthouse.html
 */

var { execSync, spawn } = require('child_process');
var path = require('path');
var fs = require('fs');

var BASE_URL = 'http://localhost:8091';
var REPORT_DIR = path.join(__dirname, '..', 'reports');
// Every category must reach this score or the run fails (#95).
// Override for local experiments: LIGHTHOUSE_MIN=90 npm run lighthouse
var MIN_SCORE = parseInt(process.env.LIGHTHOUSE_MIN || '100', 10);

// Returns the categories (title + rounded score) that fall below the minimum.
function checkScores(categories, min) {
  return Object.keys(categories).map(function(key) {
    return { key: key, title: categories[key].title, score: Math.round(categories[key].score * 100) };
  }).filter(function(c) { return c.score < min; });
}

async function main() {
  // Ensure reports directory exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  // Start local server
  var server = spawn('python3', ['-m', 'http.server', '8091'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore'
  });

  // Wait for server to start
  await new Promise(function(resolve) { setTimeout(resolve, 1000); });

  var exitCode = 0;
  try {

    console.log('Running Lighthouse audit on ' + BASE_URL + '...\n');

    var lhResult = execSync(
      'npx lighthouse ' + BASE_URL +
      ' --output=html --output=json' +
      ' --output-path=' + path.join(REPORT_DIR, 'lighthouse') +
      ' --chrome-flags="--headless --no-sandbox"' +
      ' --only-categories=performance,accessibility,best-practices,seo' +
      ' --quiet' +
      ' 2>&1',
      {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
        timeout: 120000
      }
    );

    // Parse JSON report for scores
    var jsonPath = path.join(REPORT_DIR, 'lighthouse.report.json');
    if (fs.existsSync(jsonPath)) {
      var report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      var categories = report.categories;

      console.log('=== Lighthouse Scores ===\n');
      Object.keys(categories).forEach(function(key) {
        var cat = categories[key];
        var score = Math.round(cat.score * 100);
        var bar = score >= 90 ? '🟢' : (score >= 50 ? '🟡' : '🔴');
        console.log('  ' + bar + ' ' + cat.title + ': ' + score);
      });
      console.log('\nFull report: ' + path.join(REPORT_DIR, 'lighthouse.report.html'));

      var below = checkScores(categories, MIN_SCORE);
      if (below.length > 0) {
        console.error('\n✗ Below ' + MIN_SCORE + ': ' + below.map(function(c) { return c.title + ' ' + c.score; }).join(', '));
        exitCode = 1;
      } else {
        console.log('\n✓ All categories at ' + MIN_SCORE + '+');
      }

      // Clean up JSON (keep only HTML)
      fs.unlinkSync(jsonPath);
    } else {
      console.error('No Lighthouse JSON report produced:\n' + lhResult);
      exitCode = 1;
    }

  } catch (err) {
    console.error('Error:', err.message);
    exitCode = 1;
  } finally {
    server.kill();
    process.exit(exitCode);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkScores: checkScores };
