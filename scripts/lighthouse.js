/**
 * Run Lighthouse audit on the app.
 * Uses @lhci/cli with a local server.
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
    var reportPath = path.join(REPORT_DIR, 'lighthouse.html');

    console.log('Running Lighthouse audit on ' + BASE_URL + '...\n');

    var result = execSync(
      'npx lhci collect' +
      ' --url=' + BASE_URL +
      ' --settings.output=html' +
      ' --settings.outputPath=' + reportPath +
      ' --settings.chromeFlags="--headless --no-sandbox"' +
      ' --settings.onlyCategories="performance,accessibility,best-practices,seo,pwa"' +
      ' 2>&1 || true',
      {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
        timeout: 120000
      }
    );

    // lhci collect puts reports in .lighthouseci/, let's also run directly
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

      // Clean up JSON (keep only HTML)
      fs.unlinkSync(jsonPath);
    } else {
      console.log(lhResult);
    }

    // Clean up .lighthouseci if created
    var lhciDir = path.join(__dirname, '..', '.lighthouseci');
    if (fs.existsSync(lhciDir)) {
      fs.rmSync(lhciDir, { recursive: true });
    }

  } catch (err) {
    console.error('Error:', err.message);
    exitCode = 1;
  } finally {
    server.kill();
    process.exit(exitCode);
  }
}

main();
