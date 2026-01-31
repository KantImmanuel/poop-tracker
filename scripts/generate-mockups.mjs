#!/usr/bin/env node
/**
 * generate-mockups.mjs
 *
 * Captures iPhone-sized (390x844) screenshots of every app screen
 * by starting the React dev server, injecting mock auth into
 * localStorage, and intercepting API calls with realistic data.
 *
 * Usage:
 *   node scripts/generate-mockups.mjs          # auto-starts dev server
 *   node scripts/generate-mockups.mjs --url http://localhost:3000  # use running server
 *
 * Output: public/mockups/*.png
 */

import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'mockups');

// ── Mock data ───────────────────────────────────────────────────────────────

const MOCK_USER = { id: 1, email: 'demo@gutfeeling.app' };
const MOCK_TOKEN = 'mock-jwt-token-for-screenshots';

const now = new Date();
const hourAgo = new Date(now - 3600_000);
const twoHoursAgo = new Date(now - 7200_000);
const yesterday = new Date(now - 86400_000);
const twoDaysAgo = new Date(now - 172800_000);

const MOCK_MEALS = [
  {
    id: 1,
    timestamp: twoHoursAgo.toISOString(),
    foods: [
      { name: 'Avocado Toast', ingredients: ['sourdough', 'avocado', 'olive oil', 'chili flakes', 'sea salt'], confidence: 0.95 },
      { name: 'Oat Milk Latte', ingredients: ['espresso', 'oat milk'], confidence: 0.9 }
    ]
  },
  {
    id: 2,
    timestamp: yesterday.toISOString(),
    foods: [
      { name: 'Chicken Tikka Masala', ingredients: ['chicken', 'yogurt', 'tomato', 'cream', 'garam masala', 'garlic', 'ginger'], restaurant: 'Curry House', confidence: 0.88 },
      { name: 'Garlic Naan', ingredients: ['wheat flour', 'garlic', 'butter', 'yogurt'], confidence: 0.92 }
    ]
  },
  {
    id: 3,
    timestamp: twoDaysAgo.toISOString(),
    foods: [
      { name: 'Caesar Salad', ingredients: ['romaine lettuce', 'parmesan', 'croutons', 'caesar dressing', 'anchovy'], confidence: 0.91 }
    ]
  }
];

const MOCK_POOPS = [
  { id: 1, timestamp: hourAgo.toISOString(), severity: 'moderate' },
  { id: 2, timestamp: yesterday.toISOString(), severity: 'mild' },
  { id: 3, timestamp: twoDaysAgo.toISOString(), severity: 'severe' }
];

const MOCK_INSIGHTS = {
  totalMeals: 12,
  totalPoops: 8,
  daysTracked: 14,
  summary: 'Dairy and garlic show the strongest correlation with your symptoms. Meals containing cream or yogurt were followed by issues 75% of the time.',
  triggers: [
    { name: 'Dairy (cream, yogurt)', confidence: 0.82, reason: 'Present in 6 of 8 meals before symptoms, especially cream-based dishes' },
    { name: 'Garlic', confidence: 0.65, reason: 'Eaten 10 times, suspect in 6 cases — often paired with dairy' },
    { name: 'Wheat / Gluten', confidence: 0.48, reason: 'Eaten 8 times, suspect in 4 — may be coincidental with dairy' },
    { name: 'Spicy foods', confidence: 0.35, reason: 'Only 3 occurrences — not enough data to be confident' }
  ],
  safeFoods: [
    { name: 'Rice', reason: 'Eaten 7 times with no issues following' },
    { name: 'Chicken (plain)', reason: 'Eaten 5 times, only 1 mild episode' },
    { name: 'Oat milk', reason: 'Used 4 times as a dairy substitute with no issues' }
  ],
  timingInsights: 'Most symptoms appear 8-14 hours after eating trigger foods. Garlic-heavy meals tend to cause issues slightly faster (6-10 hours).',
  nextSteps: [
    'Try eliminating dairy for 2 weeks and note any changes',
    'When eating garlic, avoid combining with dairy',
    'Keep logging — 2 more weeks of data will improve accuracy'
  ],
  notes: 'Dairy and garlic show the strongest correlation with your symptoms.'
};

const MOCK_FOOD_LOGGED = {
  id: 99,
  foods: [
    { name: 'Margherita Pizza', ingredients: ['wheat flour', 'tomato sauce', 'fresh mozzarella', 'basil', 'olive oil'], restaurant: "Joe's Pizza", confidence: 0.94 },
    { name: 'Side Salad', ingredients: ['mixed greens', 'cherry tomatoes', 'balsamic vinaigrette'], confidence: 0.87 }
  ]
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function waitForServer(url, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 304) return resolve();
      } catch { /* not ready yet */ }
      if (Date.now() - start > timeoutMs) return reject(new Error('Dev server timed out'));
      setTimeout(check, 1000);
    };
    check();
  });
}

function startDevServer() {
  const child = spawn('npx', ['react-scripts', 'start'], {
    cwd: ROOT,
    env: { ...process.env, BROWSER: 'none', PORT: '3099' },
    stdio: 'pipe',
    shell: true
  });
  child.stdout.on('data', (d) => process.stdout.write(`[dev] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[dev] ${d}`));
  return child;
}

// ── API route interceptor ───────────────────────────────────────────────────

async function interceptAPIs(page) {
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/api/meals') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MEALS) });
    }
    if (url.includes('/api/poops') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_POOPS) });
    }
    if (url.includes('/api/insights/correlations')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_INSIGHTS) });
    }
    if (url.includes('/api/insights/analyze')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_INSIGHTS) });
    }
    if (url.includes('/api/meals') && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_FOOD_LOGGED) });
    }
    if (url.includes('/api/poops') && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 99, timestamp: new Date().toISOString(), severity: 'moderate' }) });
    }

    return route.continue();
  });
}

async function injectAuth(page) {
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, { token: MOCK_TOKEN, user: MOCK_USER });
}

// ── Screenshot capture ──────────────────────────────────────────────────────

async function captureScreenshots(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  // ── 0. Landing page (logged-out) ────────────────────────────────────────
  console.log('Capturing: landing.png');
  const landingPage = await context.newPage();
  await landingPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await landingPage.waitForTimeout(500);
  await landingPage.screenshot({ path: path.join(OUT, 'landing.png'), fullPage: true });
  await landingPage.close();

  // ── 1. Home screen ──────────────────────────────────────────────────────
  console.log('Capturing: home.png');
  const homePage = await context.newPage();
  await interceptAPIs(homePage);
  await homePage.goto(baseUrl, { waitUntil: 'networkidle' });
  await injectAuth(homePage);
  await homePage.goto(baseUrl, { waitUntil: 'networkidle' });
  await homePage.waitForTimeout(500);
  await homePage.screenshot({ path: path.join(OUT, 'home.png'), fullPage: false });
  await homePage.close();

  // ── 2. Food Logged confirmation ─────────────────────────────────────────
  console.log('Capturing: food-logged.png');
  const loggedPage = await context.newPage();
  await interceptAPIs(loggedPage);
  await loggedPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await injectAuth(loggedPage);
  await loggedPage.goto(`${baseUrl}/log-meal`, { waitUntil: 'networkidle' });
  await loggedPage.waitForTimeout(300);
  // Inject a fake result state via React internals by manipulating the DOM
  // Since we can't easily set React state from outside, we'll use the manual meal flow
  // and intercept the POST to return our mock data
  await loggedPage.goto(`${baseUrl}/log-meal?manual=true`, { waitUntil: 'networkidle' });
  await loggedPage.waitForTimeout(300);
  // Fill in a food name and submit
  await loggedPage.fill('input[placeholder*="Food name"]', 'Margherita Pizza');
  await loggedPage.fill('input[placeholder*="Ingredients"]', 'wheat flour, tomato sauce, fresh mozzarella, basil, olive oil');
  await loggedPage.click('button:has-text("Save Meal")');
  await loggedPage.waitForTimeout(800);
  await loggedPage.screenshot({ path: path.join(OUT, 'food-logged.png'), fullPage: false });
  await loggedPage.close();

  // ── 4. Log Poop screen (severity picker) ────────────────────────────────
  console.log('Capturing: log-poop.png');
  const poopPage = await context.newPage();
  await interceptAPIs(poopPage);
  await poopPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await injectAuth(poopPage);
  await poopPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await poopPage.waitForTimeout(500);
  // Click the "Log Poop" button to show severity picker
  await poopPage.click('button:has-text("Log Poop")');
  await poopPage.waitForTimeout(400);
  await poopPage.screenshot({ path: path.join(OUT, 'log-poop.png'), fullPage: false });
  await poopPage.close();

  // ── 5. Insights screen ─────────────────────────────────────────────────
  console.log('Capturing: insights.png');
  const insightsPage = await context.newPage();
  await interceptAPIs(insightsPage);
  await insightsPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await injectAuth(insightsPage);
  await insightsPage.goto(`${baseUrl}/insights`, { waitUntil: 'networkidle' });
  await insightsPage.waitForTimeout(800);
  await insightsPage.screenshot({ path: path.join(OUT, 'insights.png'), fullPage: true });
  await insightsPage.close();

  await browser.close();
  console.log(`\nAll screenshots saved to ${OUT}/`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const urlArg = process.argv.find((a, i) => process.argv[i - 1] === '--url');
  let devServer = null;
  let baseUrl = urlArg || 'http://localhost:3099';

  if (!urlArg) {
    console.log('Starting dev server on port 3099...');
    devServer = startDevServer();
    try {
      await waitForServer(baseUrl);
      console.log('Dev server is ready.\n');
    } catch (e) {
      console.error(e.message);
      devServer.kill();
      process.exit(1);
    }
  }

  try {
    await captureScreenshots(baseUrl);
  } finally {
    if (devServer) {
      devServer.kill('SIGTERM');
      console.log('Dev server stopped.');
    }
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
