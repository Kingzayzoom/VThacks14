import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const captures = "docs/screenshots/agents";

test("agents constellation reflects mission state, filters, selection and visual pause", async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith(process.env.TEST_BASE_URL || "http://127.0.0.1:3000") && !request.url().startsWith("data:")) external.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/agents");
  await expect(page.getByRole("heading", { name: "AGENTS." })).toBeVisible();
  await expect(page.getByRole("link", { name: "AGENTS 03" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".constellation-atmosphere")).toHaveAttribute("data-rendered", "true");
  const firstFrame = await page.locator(".constellation-atmosphere").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await expect.poll(() => page.locator(".constellation-atmosphere").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(firstFrame);
  await expect(page.locator(".constellation-node")).toHaveCount(6);
  await expect(page.locator(".constellation-signal")).toHaveCount(1);
  await page.getByRole("button", { name: "Inspect Sage", exact: true }).click();
  const inspector = page.getByRole("complementary", { name: "Agent inspector" });
  await expect(inspector.getByRole("heading", { name: "Sage", exact: true })).toBeVisible();
  await expect(inspector).toContainText("dataset.read:public-demo");
  await expect(inspector).toContainText("Demo fixture");
  await expect(inspector).toContainText("Not checked");
  await page.getByRole("button", { name: "Focus selected branch" }).click();
  await expect(page.locator('.constellation-link[data-agent="scout"]')).toHaveClass(/is-dim/);
  await page.getByRole("button", { name: "Pause demo mission" }).click();
  await expect(page.locator(".constellation-signal")).toHaveCount(0);
  await expect(page.getByLabel("Selected mission summary").locator("div").filter({ hasText: "EXECUTING" })).toContainText("00");
  await expect(page.locator(".constellation-atmosphere")).toHaveAttribute("data-motion", "fluid");
  await page.getByRole("button", { name: "Resume demo mission" }).click();
  await expect(page.locator(".constellation-signal")).toHaveCount(1);
  await page.getByRole("button", { name: "Pause visual motion" }).click();
  await expect(page.locator(".constellation-atmosphere")).toHaveAttribute("data-motion", "still");
  const stillFrame = await page.locator(".constellation-atmosphere").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  // The canvas must remain identical across several normal frame-clock ticks.
  await page.waitForTimeout(180);
  expect(await page.locator(".constellation-atmosphere").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(stillFrame);
  expect(await page.locator(".constellation-signal").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await page.getByRole("button", { name: "Resume visual motion" }).click();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("agents discovery and previews are honest, accessible, and responsive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/agents");
  const inspector = page.getByRole("complementary", { name: "Agent inspector" });
  await page.getByLabel("Search agents", { exact: true }).fill("nobody matches this");
  await expect(page.getByRole("heading", { name: "No matching agents." })).toBeVisible();
  await page.getByRole("button", { name: "Clear agent search" }).click();
  await page.getByRole("combobox", { name: "Filter agents", exact: true }).selectOption("review");
  await expect(page.locator(".constellation-node")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Inspect Forge", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset field view" }).click();
  await expect(inspector.getByRole("heading", { name: "Perihelion", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Inspect Memory", exact: true }).click();
  await expect(inspector).toContainText("Not connected");
  await expect(inspector).toContainText("0 scoped permissions");
  await expect(inspector).toContainText("Not assigned");
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.locator(".constellation-roster-row")).toHaveCount(7);
  await page.getByRole("button", { name: "Reset field view" }).click();
  await page.mouse.move(1, 1);
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(captures, { recursive: true });
  await page.screenshot({ path: `${captures}/desktop.png`, fullPage: true });
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: `${captures}/wide.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: `${captures}/compact.png`, fullPage: true });
});

test("mobile agents use a readable roster, keyboard inspector, and optional scrollable map", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/agents");
  await expect(page.locator(".constellation-roster-row")).toHaveCount(7);
  await page.getByRole("button", { name: "Inspect Forge", exact: true }).click();
  const inspector = page.getByRole("complementary", { name: "Agent inspector" });
  await expect(inspector).toBeFocused();
  await expect(inspector.getByRole("heading", { name: "Forge", exact: true })).toBeVisible();
  await expect(inspector).toContainText("Needs review");
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  fs.mkdirSync(captures, { recursive: true });
  await page.screenshot({ path: `${captures}/mobile-inspector.png` });
  await page.getByRole("button", { name: "Reset field view" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${captures}/mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Map view" }).click();
  await expect(page.locator(".constellation-map")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "List view" }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "FIELD 01" }).click();
  await expect(page.getByRole("heading", { name: "FIELD." })).toBeVisible();
});

test("constellation honors reduced motion and remains usable without Canvas", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/agents");
  await page.getByRole("button", { name: "Inspect Sage", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Agent inspector" }).getByRole("heading", { name: "Sage", exact: true })).toBeVisible();
  await expect(page.locator(".constellation-link")).toHaveCount(5);
  expect(await page.locator(".constellation-signal").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await page.getByRole("button", { name: "Inspect Guardian", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Agent inspector" })).toContainText("cannot grant its own permissions");
});
