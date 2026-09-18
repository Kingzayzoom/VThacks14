import { test, expect } from "@playwright/test";

test("procedural field moves, pauses, resumes, and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const canvas = page.locator(".living-entry");
  await expect(canvas).toHaveAttribute("data-motion", "fluid");
  await expect(canvas).toHaveAttribute("data-rendered", "true");
  const pixels = () => canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  const first = await pixels();
  await expect.poll(pixels).not.toBe(first);
  await page.getByRole("button", { name: "Pause visual motion" }).click();
  await expect(canvas).toHaveAttribute("data-motion", "still");
  await page.waitForTimeout(100);
  const paused = await pixels();
  await page.waitForTimeout(300);
  expect(await pixels()).toBe(paused);
  await page.getByRole("button", { name: "Resume visual motion" }).click();
  await expect(canvas).toHaveAttribute("data-motion", "fluid");
  await expect.poll(pixels).not.toBe(paused);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(canvas).toHaveAttribute("data-motion", "still");
  await page.waitForTimeout(100);
  const reduced = await pixels();
  await page.mouse.move(1350, 700);
  await page.waitForTimeout(300);
  expect(await pixels()).toBe(reduced);
  await page.goto("/field");
  await expect(page.locator(".network-visual .living-field")).toHaveAttribute("data-motion", "still");
  await expect(page.locator(".signal-trace")).toHaveCount(1);
  expect(await page.locator(".signal-trace").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await page.getByRole("button", { name: "Pause demo mission" }).click();
  await expect(page.locator(".signal-trace")).toHaveCount(0);
});

test("canvas failure preserves the composer, contours and selectable agents", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Prepare a launch brief" }).click();
  await expect(page.locator("#objective")).toHaveValue(/Prepare a launch brief/);
  await expect(page.locator(".atmosphere > svg")).toBeVisible();
  await page.getByRole("link", { name: "Enter workspace" }).click();
  await page.getByRole("button", { name: "Inspect Sage", exact: true }).first().click();
  await expect(page.locator("#selected-agent-details")).toContainText("Sage");
  await expect(page.locator(".contour-sheet")).toBeVisible();
});
