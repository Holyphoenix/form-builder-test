#!/usr/bin/env node

/**
 * Automated Performance Test for Form Builder
 * 
 * This script uses Playwright to automatically test the form builder
 * with 10,000 fields and measure performance metrics.
 * 
 * Usage:
 *   npm run test:performance
 * 
 * Or with custom field count:
 *   node performance-test.js --count=5000
 */

const { chromium } = require('playwright');

async function runPerformanceTest(fieldCount = 10000) {
  console.log('\n🚀 Starting Performance Test');
  console.log(`   Field Count: ${fieldCount.toLocaleString()}`);
  console.log('   ----------------------------------------\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('✓') || text.includes('success') || text.includes('info')) {
      console.log(`   ${text}`);
    }
  });

  try {
    // Start local server in background (assumes npm run dev is running)
    console.log('   📡 Connecting to http://localhost:5173/performance-test.html\n');
    
    await page.goto(`http://localhost:5173/performance-test.html?auto=true&count=${fieldCount}`, {
      waitUntil: 'networkidle'
    });

    // Wait for fields to load
    console.log('   ⏳ Waiting for fields to load...\n');
    await page.waitForTimeout(5000); // Give time for rendering

    // Extract performance metrics
    const metrics = await page.evaluate(() => {
      return {
        fieldCount: document.getElementById('fieldCount').textContent,
        loadTime: document.getElementById('loadTime').textContent,
        renderTime: document.getElementById('renderTime').textContent,
        memoryUsage: document.getElementById('memoryUsage').textContent,
        visibleRows: document.getElementById('visibleRows').textContent
      };
    });

    console.log('\n   📊 Performance Metrics:');
    console.log('   ----------------------------------------');
    console.log(`   Total Fields:     ${metrics.fieldCount}`);
    console.log(`   Load Time:        ${metrics.loadTime}`);
    console.log(`   Initial Render:   ${metrics.renderTime}`);
    console.log(`   Memory Usage:     ${metrics.memoryUsage}`);
    console.log(`   Visible Rows:     ${metrics.visibleRows}`);
    console.log('   ----------------------------------------\n');

    // Run scroll performance test
    console.log('   🔄 Testing scroll performance...\n');
    await page.click('#testScroll');
    
    // Wait for scroll test to complete
    await page.waitForTimeout(4000);

    // Get scroll performance metrics
    const scrollMetrics = await page.evaluate(() => {
      return {
        scrollFps: document.getElementById('scrollFps').textContent
      };
    });

    console.log(`   Scroll FPS:       ${scrollMetrics.scrollFps}\n`);

    // Evaluate performance
    const loadTimeMs = parseInt(metrics.loadTime);
    const renderTimeMs = parseInt(metrics.renderTime);
    const fps = parseFloat(scrollMetrics.scrollFps);

    console.log('\n   ✅ Performance Evaluation:');
    console.log('   ----------------------------------------');

    if (renderTimeMs < 500) {
      console.log('   ✓ Render Time: EXCELLENT (<500ms)');
    } else if (renderTimeMs < 1000) {
      console.log('   ✓ Render Time: GOOD (500-1000ms)');
    } else {
      console.log('   ⚠️  Render Time: NEEDS IMPROVEMENT (>1000ms)');
    }

    if (fps >= 50) {
      console.log('   ✓ Scroll FPS: EXCELLENT (50+ fps)');
    } else if (fps >= 30) {
      console.log('   ✓ Scroll FPS: GOOD (30-50 fps)');
    } else {
      console.log('   ⚠️  Scroll FPS: NEEDS IMPROVEMENT (<30 fps)');
    }

    console.log('   ----------------------------------------\n');

    // Take screenshot
    await page.screenshot({ path: 'performance-test-screenshot.png', fullPage: true });
    console.log('   📸 Screenshot saved: performance-test-screenshot.png\n');

    console.log('   ✅ Performance test completed successfully!\n');

  } catch (error) {
    console.error('\n   ❌ Error during performance test:', error.message);
    console.error('\n   Make sure the dev server is running: npm run dev\n');
  } finally {
    await browser.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let fieldCount = 10000;

for (const arg of args) {
  if (arg.startsWith('--count=')) {
    fieldCount = parseInt(arg.split('=')[1]);
  }
}

// Check if playwright is installed
try {
  require.resolve('playwright');
  runPerformanceTest(fieldCount);
} catch (e) {
  console.error('\n❌ Playwright is not installed.');
  console.error('   Install it with: npm install --save-dev playwright\n');
  console.error('   Or run the manual test at: http://localhost:5173/performance-test.html\n');
  process.exit(1);
}
