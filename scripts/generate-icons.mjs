#!/usr/bin/env node
/**
 * generate-icons.mjs
 *
 * Generates PWA icons (192x192 and 512x512) to replace the default React logos.
 * Uses Playwright to render styled HTML and screenshot it.
 *
 * Output: public/logo192.png, public/logo512.png
 */

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 512px;
    height: 512px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(145deg, #FFF3E3 0%, #F2E6D8 100%);
    border-radius: 112px;
    position: relative;
    overflow: hidden;
  }
  body::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, #E8D9C8 1.5px, transparent 1.5px);
    background-size: 24px 24px;
    opacity: 0.3;
  }
  .icon {
    position: relative;
    z-index: 1;
    font-size: 240px;
    line-height: 1;
    text-align: center;
    filter: drop-shadow(0 8px 24px rgba(74, 46, 31, 0.15));
  }
</style>
</head>
<body>
  <div class="icon">🍽️💩</div>
</body>
</html>`;

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 512x512
  console.log('Generating logo512.png...');
  const page512 = await browser.newPage({
    viewport: { width: 512, height: 512 },
    deviceScaleFactor: 1,
  });
  await page512.setContent(html, { waitUntil: 'networkidle' });
  await page512.waitForTimeout(300);
  await page512.screenshot({ path: path.join(ROOT, 'public', 'logo512.png'), fullPage: false });
  await page512.close();

  // 192x192
  console.log('Generating logo192.png...');
  const page192 = await browser.newPage({
    viewport: { width: 192, height: 192 },
    deviceScaleFactor: 1,
  });
  const html192 = html
    .replace('512px', '192px').replace('512px', '192px')
    .replace('112px', '42px')
    .replace('240px', '88px')
    .replace('24px 24px', '16px 16px');
  await page192.setContent(html192, { waitUntil: 'networkidle' });
  await page192.waitForTimeout(300);
  await page192.screenshot({ path: path.join(ROOT, 'public', 'logo192.png'), fullPage: false });
  await page192.close();

  // 32x32 favicon PNG (used as favicon.ico replacement)
  console.log('Generating favicon.ico...');
  const page32 = await browser.newPage({
    viewport: { width: 32, height: 32 },
    deviceScaleFactor: 1,
  });
  const htmlFav = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    background: #FFF3E3;
    border-radius: 6px;
  }
  .icon { font-size: 22px; line-height: 1; }
</style></head>
<body><div class="icon">💩</div></body></html>`;
  await page32.setContent(htmlFav, { waitUntil: 'networkidle' });
  await page32.waitForTimeout(300);
  await page32.screenshot({ path: path.join(ROOT, 'public', 'favicon.png'), fullPage: false });
  await page32.close();

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
