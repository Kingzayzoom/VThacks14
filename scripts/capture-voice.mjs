import { chromium } from '@playwright/test';
import fs from 'node:fs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3023';
const directory = 'docs/screenshots/voice';
fs.mkdirSync(directory, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [size, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport });
    // This captures the configured form, not a real provider connection.
    await page.route('**/api/voice/session', async (route) => {
      if (route.request().method() !== 'GET') throw new Error('Screenshot capture must not start voice');
      await route.fulfill({ json: { configured: true } });
    });
    await page.goto(base + '/agents');
    await page.getByRole('button', { name: 'Voice connection information' }).click();
    await page.getByLabel('Team voice access code').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${directory}/configured-preview-${size}.png` });
    await page.close();
    console.log(`configured-preview-${size}`);
  }
} finally { await browser.close(); }
