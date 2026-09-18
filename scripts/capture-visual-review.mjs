import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const out = process.argv[2] || "docs/screenshots";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const screen of ["entry", "field"]) {
  await page.goto(base + (screen === "entry" ? "/" : "/field"), {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/${screen}-desktop.png` });
  console.log(
    screen,
    await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    })),
  );
}
await page.setViewportSize({ width: 390, height: 844 });
for (const screen of ["entry", "field"]) {
  await page.goto(base + (screen === "entry" ? "/" : "/field"), {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${out}/${screen}-mobile.png`,
    fullPage: true,
  });
  await page.screenshot({ path: `${out}/${screen}-mobile-viewport.png` });
  console.log(
    screen + " mobile",
    await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    })),
  );
}
await browser.close();
