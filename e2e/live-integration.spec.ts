import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
test.skip(process.env.LIVE_E2E !== "1", "Requires the real local Python hub and a live-mode Next server");
test("real hub mission, event stream, sandboxed result and evidence survive desktop/mobile navigation", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("connected", {timeout:15000});
  await page.getByLabel("Your objective").fill("Build a premium lead-generation website for a dental practice in Blacksburg. It needs online appointment conversion, strong mobile UX, and local SEO.");
  await page.getByRole("button",{name:"Start mission",exact:true}).click();
  await expect(page).toHaveURL(/\/missions\/m_/);
  await expect(page.getByRole("heading",{name:"Mission detail",exact:true})).toBeVisible();
  await expect(page.locator(".task-item")).toHaveCount(3,{timeout:20000});
  await expect(page.getByTitle("Mission result")).toBeVisible({timeout:45000});
  await expect(page.getByTitle("Mission result")).toHaveAttribute("sandbox", "");
  await expect(page.getByText("Local ANS simulator evidence",{exact:false})).toBeVisible();
  await page.locator(".mission-activity summary").click();
  await expect(page.locator(".activity-list li")).not.toHaveCount(0);
  fs.mkdirSync("docs/screenshots/integration/live",{recursive:true});
  for (const [size,viewport] of Object.entries({desktop:{width:1440,height:900},mobile:{width:390,height:844}})) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:`docs/screenshots/integration/live/mission-${size}.png`,fullPage: size === "desktop"});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).exclude("iframe").withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
  }
  await page.goto("/agents");
  await page.getByLabel("Search agents").fill("BrandStudio");
  await page.getByRole("button",{name:"Inspect BrandStudio",exact:true}).click();
  await expect(page.getByLabel("Agent inspector",{exact:true})).toContainText("Simulator evidence");
  await expect(page.getByLabel("Agent inspector",{exact:true})).toContainText("Active authority is reported by Guardian");
  await page.getByText("Identity evidence",{exact:false}).click();
  await expect(page.getByLabel("Agent inspector",{exact:true})).toContainText("authenticate: pass");
  await page.getByLabel("Agent inspector",{exact:true}).evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({path:"docs/screenshots/integration/live/agent-mobile.png"});
  expect(errors).toEqual([]);
});
