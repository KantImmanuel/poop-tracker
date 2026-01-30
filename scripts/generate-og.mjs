#!/usr/bin/env node
/**
 * generate-og.mjs
 *
 * Generates a 1200x630 Open Graph image for social sharing.
 * Uses Playwright to render styled HTML and screenshot it.
 *
 * Output: public/og.png
 */

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'og.png');

// Read screenshots and encode as base64 data URLs
const homeImg = readFileSync(path.join(ROOT, 'public', 'mockups', 'home.png')).toString('base64');
const insightsImg = readFileSync(path.join(ROOT, 'public', 'mockups', 'insights.png')).toString('base64');

const html = `<!DOCTYPE html>
<html>
<head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Nunito:wght@600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 1200px;
    height: 630px;
    background: #FFF3E3;
    font-family: 'Nunito', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }

  body::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, #E8D9C8 1px, transparent 1px);
    background-size: 32px 32px;
    opacity: 0.4;
  }

  .container {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 60px;
    padding: 0 80px;
    width: 100%;
  }

  .left {
    flex: 1;
  }

  .emoji {
    font-size: 64px;
    margin-bottom: 16px;
    display: block;
  }

  h1 {
    font-family: 'Fredoka', sans-serif;
    font-size: 52px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: #4A2E1F;
    margin-bottom: 16px;
  }

  h1 span {
    color: #7E8B47;
  }

  .tagline {
    font-size: 22px;
    color: #7A5A44;
    line-height: 1.4;
    max-width: 420px;
  }

  .right {
    display: flex;
    gap: 16px;
    flex-shrink: 0;
  }

  .phone {
    width: 160px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow:
      0 12px 40px rgba(74, 46, 31, 0.15),
      0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .phone img {
    width: 100%;
    height: auto;
    display: block;
  }

  .phone:nth-child(2) {
    margin-top: 40px;
  }

  .badge {
    position: absolute;
    bottom: 32px;
    right: 80px;
    background: #7E8B47;
    color: white;
    font-family: 'Fredoka', sans-serif;
    font-size: 16px;
    font-weight: 600;
    padding: 8px 20px;
    border-radius: 50px;
    z-index: 1;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="left">
      <span class="emoji">🍽️💩</span>
      <h1>Find your food triggers.<br><span>Without spreadsheets.</span></h1>
      <p class="tagline">Snap meals, log symptoms, and let AI find the patterns.</p>
    </div>
    <div class="right">
      <div class="phone">
        <img src="data:image/png;base64,${homeImg}" />
      </div>
      <div class="phone">
        <img src="data:image/png;base64,${insightsImg}" />
      </div>
    </div>
  </div>
  <div class="badge">gutfeeling.app</div>
</body>
</html>`;

async function main() {
  console.log('Generating og.png...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: OUT, fullPage: false });
  await browser.close();
  console.log(`Saved: ${OUT}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
