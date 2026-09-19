import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

test("the real voice SDK handles microphone denial without contacting ElevenLabs", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      document.documentElement.dataset.microphoneAttempt = "true";
      throw new DOMException("Test permission denial", "NotAllowedError");
    };
  });
  const external: string[] = [];
  await page.route("https://**", async (route) => { external.push(route.request().url()); await route.abort(); });
  await page.route("**/api/voice/session", (route) => route.fulfill({ json: route.request().method() === "POST" ? { conversationToken: "test-token-never-sent-to-provider" } : { configured: true } }));
  await page.goto("/agents");
  await page.getByRole("button", { name: "Voice connection information" }).click();
  const dialog = page.getByRole("dialog", { name: "Voice channel" });
  await dialog.getByLabel("Team voice access code").fill("test-only-access-code");
  await dialog.getByRole("button", { name: "Start voice", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Microphone access was denied");
  expect(await page.locator("html").getAttribute("data-microphone-attempt")).toBe("true");
  expect(external).toEqual([]);
  await expect(dialog.getByRole("button", { name: "Start voice", exact: true })).toBeVisible();
});

for (const [size, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
  test(`voice availability, access failure, text fallback and categories at ${size}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    // Fail the test if this configured-looking UI requests a microphone before authorization.
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => { throw new Error("Unexpected microphone access"); };
    });
    let sessionRequests = 0;
    await page.route("**/api/voice/session", async (route) => {
      if (route.request().method() === "POST") {
        sessionRequests++;
        await route.fulfill({ status: 401, json: { error: "The voice access code was not accepted." } });
      } else await route.fulfill({ json: { configured: true } });
    });
    await page.goto("/agents");
    await page.getByLabel("Filter agents").selectOption("category:Research");
    await expect(page.getByRole("button", { name: "Inspect Scout", exact: true })).toBeVisible();
    await expect(page.locator(".constellation-roster-row")).toHaveCount(1);
    await page.getByLabel("Filter agents").selectOption("category:Voice");
    await expect(page.getByRole("button", { name: "Inspect Voice", exact: true })).toBeVisible();
    await expect(page.locator(".constellation-roster-row")).toHaveCount(1);
    fs.mkdirSync("docs/screenshots/layering/verification/voice", { recursive: true });
    await page.screenshot({ path: `docs/screenshots/layering/verification/voice/categories-${size}.png`, fullPage: true });
    await page.getByRole("button", { name: "Voice connection information" }).click();
    const dialog = page.getByRole("dialog", { name: "Voice channel" });
    await expect(dialog.getByText("Microphone inactive. No audio is captured.")).toBeVisible();
    await dialog.getByLabel("Team voice access code").fill("test-only-wrong-code");
    await dialog.getByRole("button", { name: "Start voice", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("access code was not accepted");
    expect(sessionRequests).toBe(1);
    await expect(dialog.getByLabel("Team voice access code")).toHaveValue("");
    await page.screenshot({ path: `docs/screenshots/layering/verification/voice/dialog-${size}.png`, fullPage: true });
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dialog.getByRole("button", { name: "Use text instead" }).click();
    await expect(page.getByRole("dialog", { name: "New mission" }).getByLabel("Your objective")).toBeFocused();
    await page.getByRole("dialog", { name: "New mission" }).getByLabel("Your objective").fill("Rehearse the voice demo");
    await page.getByRole("button", { name: "Start mission" }).click();
    await expect(page).toHaveURL(/\/missions\/demo-/);
  });
}
