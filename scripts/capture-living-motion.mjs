import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const out = "docs/screenshots/living-motion";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: out, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
for (let frame = 0; frame < 3; frame++) {
  await page.screenshot({ path: `${out}/entry-t${frame * 3}.png` });
  await page.waitForTimeout(3000);
}
await page.goto(base + "/field", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Inspect Sage", exact: true }).first().click();
await page.waitForTimeout(3500);
await page.getByRole("button", { name: "Inspect Forge", exact: true }).first().click();
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Pause demo mission" }).click();
await page.waitForTimeout(2000);
await context.close();
await page.video().saveAs(`${out}/perihelion-living-field.webm`);
await browser.close();
console.log(`Captured motion review: ${out}/perihelion-living-field.webm`);
