import { chromium } from '@playwright/test';
import fs from 'node:fs';

const phase = process.argv[2] || 'before';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const directory = 'docs/screenshots/reduction';
fs.mkdirSync(directory, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [size, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport });
    for (const [name, route] of [['home', '/'], ['agents', '/agents']]) {
      await page.goto(base + route);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('canvas[data-rendered="true"]').first().waitFor();
      await page.screenshot({ path: `${directory}/${phase}-${name}-${size}.png`, fullPage: true });
      console.log(`${phase}-${name}-${size}`);
    }
    await page.close();
  }
} finally { await browser.close(); }
