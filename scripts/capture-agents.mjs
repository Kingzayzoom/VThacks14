import { chromium } from "playwright";
import { mkdir, copyFile } from "node:fs/promises";

// Record the actual frontend and motion controls; never simulates mission progress.
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3018";
const destination = "docs/screenshots/agents";
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 },
    recordVideo: { dir: "test-results/agents-motion", size: { width: 1440, height: 900 } } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/agents`);
  await page.locator('.constellation-atmosphere[data-rendered="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600);
  await page.getByRole("button", { name: "Inspect Sage", exact: true }).click();
  await page.mouse.move(5, 5);
  await page.getByRole("button", { name: "Focus selected branch" }).click();
  await page.waitForTimeout(1600);
  await page.getByRole("button", { name: "Pause visual motion" }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Resume visual motion" }).click();
  await page.getByRole("button", { name: "Reset field view" }).click();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${destination}/desktop.png`, fullPage: true });
  const video = page.video();
  await context.close();
  if (video) await copyFile(await video.path(), `${destination}/motion.webm`);
  console.log(`Saved ${destination}/desktop.png and motion.webm`);
} finally { await browser.close(); }
