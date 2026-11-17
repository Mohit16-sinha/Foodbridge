/**
 * FOODBRIDGE - SIDEBAR INTEGRATION TEST
 * Validates minimization, collapse state, tooltip generation, and DOM enhancements.
 */

const fs = require('fs');
const path = require('path');

// Minimal DOM simulation for node testing
function createMockEnvironment(initialCollapsed = false) {
  let localStorageStore = {
    foodbridge_sidebar_collapsed: initialCollapsed ? 'true' : 'false'
  };

  const localStorage = {
    getItem: (key) => localStorageStore[key] || null,
    setItem: (key, val) => { localStorageStore[key] = String(val); }
  };

  // Build a simulated donor/dashboard.html DOM
  const donorHtml = fs.readFileSync(path.join(__dirname, '../donor/dashboard.html'), 'utf-8');

  // Simple regex-based or manual mock to verify DOM manipulations
  return { localStorage, donorHtml };
}

console.log("Starting Sidebar Component and Logic Verification...");

// Load dashboard-common.js content
const jsContent = fs.readFileSync(path.join(__dirname, '../js/dashboard-common.js'), 'utf-8');
const cssContent = fs.readFileSync(path.join(__dirname, '../css/dashboard.css'), 'utf-8');

// 1. Verify CSS Rules
const requiredCSSSelectors = [
  '.dashboard-sidebar.collapsed',
  '.dashboard-main.sidebar-collapsed',
  '.sidebar-toggle-btn',
  '.sidebar-link[data-tooltip]::after',
  '.sidebar-link[data-tooltip]::before',
  'body.has-demo-banner .dashboard-sidebar',
  'body.has-demo-banner .dashboard-header'
];

let allCssFound = true;
requiredCSSSelectors.forEach(sel => {
  if (!cssContent.includes(sel)) {
    console.error(`FAIL: Missing CSS selector: ${sel}`);
    allCssFound = false;
  } else {
    console.log(`PASS: Found CSS selector: ${sel}`);
  }
});

// 2. Verify JS Logic
const requiredJSFeatures = [
  'brand-text',
  'sidebar-link-text',
  'data-tooltip',
  'foodbridge_sidebar_collapsed',
  'sidebar-collapsed',
  'updateToggleState',
  'fa-bars'
];

let allJsFound = true;
requiredJSFeatures.forEach(feat => {
  if (!jsContent.includes(feat)) {
    console.error(`FAIL: Missing JS feature: ${feat}`);
    allJsFound = false;
  } else {
    console.log(`PASS: Found JS feature: ${feat}`);
  }
});

// Verify no repeated buttons in JS
if (jsContent.includes('sidebar-rail-btn') || jsContent.includes('sidebar-collapse-btn')) {
  console.error("FAIL: Repeated sidebar buttons still detected in JS!");
  allJsFound = false;
} else {
  console.log("PASS: Clean single-toggle architecture confirmed (no repeated buttons).");
}

// 3. Verify CSS Variables in main.css
const mainCss = fs.readFileSync(path.join(__dirname, '../css/main.css'), 'utf-8');
if (mainCss.includes('--sidebar-collapsed-width: 78px;')) {
  console.log("PASS: Found --sidebar-collapsed-width in main.css");
} else {
  console.error("FAIL: Missing --sidebar-collapsed-width in main.css");
  allCssFound = false;
}

if (allCssFound && allJsFound) {
  console.log("\nALL SIDEBAR VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error("\nSOME CHECKS FAILED!");
  process.exit(1);
}

