import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

for (const [size, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
  test(`route curtain preserves navigation and focus at ${size}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/missions");
    const curtain = page.locator(".page-transition");
    await expect(curtain).toBeHidden();
    await page.getByRole("link", { name: /Student product launch/ }).click();
    await expect(curtain).toBeVisible();
    await expect(curtain.getByRole("status")).toContainText("Mission detail");
    fs.mkdirSync("docs/screenshots/transitions", { recursive: true });
    await page.screenshot({ path: `docs/screenshots/transitions/curtain-${size}.png` });
    await expect(curtain).toBeHidden();
    await expect(page.getByRole("heading", { name: "Mission detail", exact: true })).toBeFocused();
    await expect(page.locator(".page-content")).not.toHaveAttribute("inert");
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.goBack();
    await expect(page).toHaveURL(/\/missions$/);
    await expect(curtain).toBeHidden();
    await expect(page.getByRole("heading", { name: "Missions", exact: true })).toBeFocused();
    await page.goForward();
    await expect(page).toHaveURL(/\/missions\/demo-001$/);
    await expect(curtain).toBeHidden();
    await page.getByRole("button", { name: "View objective", exact: true }).click();
    await expect(curtain).toBeHidden();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "New mission", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "New mission" });
    await dialog.getByLabel("Your objective").fill("Check the page transition.");
    await dialog.getByLabel("Your objective").press("Control+Enter");
    await expect(page).not.toHaveURL(/demo-001$/);
    await expect(curtain).toBeHidden();
    await expect(page.getByRole("heading", { name: "Mission detail", exact: true })).toBeFocused();
  });
}

test("same-page links, filters, and reduced motion do not create a blocking transition", async ({ page }) => {
  await page.goto("/agents");
  const curtain = page.locator(".page-transition");
  await page.getByRole("link", { name: "Agents", exact: true }).click();
  await expect(curtain).toBeHidden();
  await page.getByLabel("Search agents", { exact: true }).fill("Scout");
  await expect(curtain).toBeHidden();
  await page.getByRole("button", { name: "Inspect Scout", exact: true }).click();
  await expect(curtain).toBeHidden();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: "Missions", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/missions$/);
  await expect(curtain).toBeHidden();
  expect(await curtain.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await expect(page.getByRole("heading", { name: "Missions", exact: true })).toBeFocused();
});
