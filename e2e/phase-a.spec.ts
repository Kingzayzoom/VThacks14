import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

test("objective composer supports keyboard submission and the workspace dialog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Your objective" }).fill("Plan our demo rehearsal.");
  await page.getByRole("textbox", { name: "Your objective" }).press("Control+Enter");
  await expect(page).toHaveURL(/\/missions\/demo-/);
  await page.getByRole("button", { name: "New mission", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Try an example", { exact: true }).click();
  await dialog.getByRole("button", { name: "Plan a research project" }).click();
  await expect(dialog.getByRole("textbox", { name: "Your objective" })).toBeFocused();
  await dialog.getByRole("button", { name: "Run objective", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/missions\/demo-/);
  await page.getByRole("link", { name: "MISSIONS 02" }).click();
  await expect(page.locator(".mission-row")).toHaveCount(3);
});

test("entry and FIELD screenshots, core interactions, and accessibility", async ({
  page,
}) => {
  fs.mkdirSync("docs/screenshots", { recursive: true });
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      !request
        .url()
        .startsWith(process.env.TEST_BASE_URL || "http://127.0.0.1:3000") &&
      !request.url().startsWith("data:")
    )
      externalRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", { name: "Intelligence, coordinated." }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/entry-desktop.png" });
  await page.getByRole("button", { name: "Run objective" }).click();
  await expect(page.locator("#composer-error")).toHaveText(
    "Describe an objective to begin.",
  );
  await page.getByText("Try an example", { exact: true }).click();
  await page.getByRole("button", { name: "Prepare a launch brief" }).click();
  await expect(page.locator("#objective")).toHaveValue(
    /Prepare a launch brief/,
  );
  expect(new URL(page.url()).pathname).toBe("/");
  await page.getByRole("button", { name: "Run objective" }).dblclick();
  await expect(page).toHaveURL(/\/missions\/demo-/);
  await expect(page.getByRole("heading", { name: "FIELD." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "FIELD." })).toBeVisible();
  await page.getByRole("link", { name: "MISSIONS 02" }).click();
  await expect(page.locator(".mission-row")).toHaveCount(2);
  await page.getByLabel("Active mission").selectOption("demo-001");
  await page.getByRole("link", { name: "FIELD 01" }).click();
  await expect(page.getByText("A capability is missing.")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/field-desktop.png" });
  await page
    .getByRole("button", { name: "Inspect Sage", exact: true })
    .first()
    .click();
  await expect(page.locator(".inspector-content")).toContainText(
    "dataset.read:public-demo",
  );
  await expect(page.locator(".inspector-content")).toContainText(
    "Demo verification only",
  );
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.locator(".network-list")).toBeVisible();
  await page.getByRole("button", { name: "Graph", exact: true }).click();
  await page.getByRole("button", { name: "Pause demo mission" }).click();
  await expect(
    page.getByRole("button", { name: "Resume demo mission" }),
  ).toBeVisible();
  await expect(page.locator(".edge.executing")).toHaveCount(0);
  await page.getByRole("button", { name: "Resume demo mission" }).click();
  await expect(page.locator(".edge.executing")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Something is missing.");
  await page.screenshot({
    path: "docs/screenshots/review-desktop.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review request", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Voice connection information" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Microphone inactive. No audio is captured.",
  );
  await page.getByRole("button", { name: "Use text instead" }).click();
  await expect(page.locator("#dock-command")).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".edge.executing")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.getByRole("button", { name: "Activity", exact: false }).click();
  const desktopA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  fs.writeFileSync(
    "docs/screenshots/accessibility.json",
    JSON.stringify(desktopA11y.violations, null, 2),
  );
  expect(desktopA11y.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/screenshots/entry-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const entryA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(entryA11y.violations).toEqual([]);
  await page.goto("/field");
  await page.evaluate(() => document.fonts.ready);
  await page
    .getByRole("button", { name: "Review pending capability request" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Something is missing.");
  await page.keyboard.press("Escape");
  await expect(page.locator(".network-list")).toBeVisible();
  await expect(page.locator(".network-visual")).not.toBeVisible();
  await page.getByRole("heading", { name: "FIELD." }).click();
  await page.screenshot({
    path: "docs/screenshots/field-mobile.png",
    fullPage: true,
  });
  await page.screenshot({ path: "docs/screenshots/field-mobile-viewport.png" });
  const mobileA11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(mobileA11y.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "SETTINGS" }).click();
  await expect(
    page.getByRole("heading", { name: "Integration readiness." }),
  ).toBeVisible();
  await expect(page.getByText("Not connected", { exact: true })).toHaveCount(4);
  await expect(page.locator(".sidebar")).not.toBeVisible();
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test("wide and compact desktop layouts stay usable", async ({ page }) => {
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/field");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".network-visual")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Review request", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/screenshots/field-${size.width}.png`,
      fullPage: true,
    });
  }
});

test("visual state guards: selection, pause, asset budget, and mobile inspection", async ({
  page,
}) => {
  const assets: { url: string; bytes: number }[] = [];
  page.on("response", async (response) => {
    if (response.url().includes("/assets/"))
      assets.push({
        url: response.url(),
        bytes: Number(response.headers()["content-length"] || 0),
      });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const desktopEntry = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(desktopEntry.violations).toEqual([]);
  await page.goto("/field");
  await page
    .getByRole("button", { name: "Inspect Sage", exact: true })
    .first()
    .click();
  await expect(page.locator(".node-sage")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.locator(".node-sage .signature-registration"),
  ).toBeVisible();
  await expect(page.locator(".network-transmission")).toContainText(
    "Sage / Shape the audience brief",
  );
  await page.getByRole("button", { name: "Pause demo mission" }).click();
  await expect(page.locator(".network-heartbeat")).not.toHaveClass(/working/);
  await expect(page.locator(".signature-running")).toHaveCount(0);
  await expect(page.locator(".network-transmission")).toContainText(
    "Mission paused",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Resume demo mission" }).click();
  for (const selector of [
    ".edge.executing",
    ".network-heartbeat .heartbeat-mark",
    ".node-sage .signature-wave",
  ]) {
    expect(
      await page
        .locator(selector)
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Inspect Forge", exact: true })
    .last()
    .click();
  await expect(page.locator("#selected-agent-details")).toBeFocused();
  await expect(page.locator("#selected-agent-details")).toBeInViewport();
  await expect(page.locator("#selected-agent-details")).toContainText("Forge");
  await page.screenshot({
    path: "docs/screenshots/inspector-mobile.png",
    fullPage: false,
  });
  expect(assets).toEqual([]); // Atmosphere is procedural; no bitmap requests.
  expect(
    assets.every((a) => !a.url.endsWith(".png") && a.bytes < 150_000),
  ).toBe(true);
});
