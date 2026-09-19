import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const captures = "docs/screenshots/reset";

test("roster reflects assignments, selection, events and real demo pause state", async ({ page }) => {
 const errors:string[]=[]; const external:string[]=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("request",r=>{if(!r.url().startsWith(process.env.TEST_BASE_URL || "http://127.0.0.1:3000")&&!r.url().startsWith("data:")) external.push(r.url());});
 await page.goto("/agents");
 await expect(page.getByRole("heading",{name:"Agents",exact:true})).toBeVisible();
 await expect(page.getByRole("link",{name:"Agents",exact:true})).toHaveAttribute("aria-current","page");
 await expect(page.locator(".constellation-roster-row")).toHaveCount(7);
 await expect(page.locator("canvas")).toHaveCount(0);
 const inspector=page.getByRole("complementary",{name:"Agent inspector"});
 await expect(inspector).toHaveCount(0);
 await page.getByRole("button",{name:"Inspect Sage",exact:true}).click();
 await expect(inspector).toContainText("dataset.read:public-demo");
 await expect(inspector).toContainText("Demo fixture");
 await expect(inspector).toContainText("Not checked");
 await page.getByRole("button",{name:"Close agent inspector"}).click();
 await expect(page.getByRole("button",{name:"Inspect Sage",exact:true})).toBeFocused();
 await page.getByRole("button",{name:"Pause demo mission"}).click();
 await expect(page.locator(".agents-mission-control")).toContainText("Execution paused");
 await expect(page.getByRole("button",{name:"Inspect Sage",exact:true})).toContainText("Paused");
 await page.getByRole("button",{name:"Resume demo mission"}).click();
 await expect(page.getByRole("button",{name:"Inspect Sage",exact:true})).toContainText("Running");
 await page.getByText("Mission activity",{exact:false}).first().click();
 await expect(page.locator(".agents-event")).toHaveCount(4);
 await page.locator(".agents-event").last().click();
 await expect(inspector).toBeVisible(); await page.keyboard.press("Escape"); await expect(inspector).toHaveCount(0);
 expect(errors).toEqual([]); expect(external).toEqual([]);
});

test("search, all seven categories, honest previews and keyboard return", async ({page})=>{
 await page.goto("/agents");
 await page.getByLabel("Search agents",{exact:true}).fill("nobody matches");
 await expect(page.getByRole("heading",{name:"No matching agents."})).toBeVisible();
 await page.getByRole("button",{name:"Clear agent search"}).click();
 const categories=await page.locator('select optgroup option').evaluateAll(els=>els.map(el=>(el as HTMLOptionElement).value));
 expect(categories).toHaveLength(7);
 for(const category of categories){await page.getByLabel("Filter agents").selectOption(category);await expect(page.locator(".constellation-roster-row")).toHaveCount(1);}
 await page.getByLabel("Filter agents").selectOption("review");
 await expect(page.getByRole("button",{name:"Inspect Forge",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Reset filters"}).click();
 await page.getByRole("button",{name:"Inspect Memory",exact:true}).click();
 const inspector=page.getByRole("complementary",{name:"Agent inspector"});
 for(const text of ["Not connected","0 scoped permissions","Not assigned","Unverified","Not checked"]) await expect(inspector).toContainText(text);
 await page.keyboard.press("Escape");
 await expect(page.getByRole("button",{name:"Inspect Memory",exact:true})).toBeFocused();
});

for(const [size,viewport] of Object.entries({desktop:{width:1440,height:900},mobile:{width:390,height:844}})){
 test(`roster and drawer accessible at ${size}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto("/agents");await page.evaluate(()=>document.fonts.ready);
 fs.mkdirSync(captures,{recursive:true});await page.screenshot({path:`${captures}/agents-${size}.png`,fullPage:true});
 expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
 await page.getByRole("button",{name:"Inspect Forge",exact:true}).click();
 const inspector=page.getByRole("complementary",{name:"Agent inspector"});await expect(inspector).toBeFocused();await expect(inspector).toContainText("Needs review");
 await page.screenshot({path:`${captures}/agent-detail-${size}.png`});
 expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.keyboard.press("Escape");
 if(size==="mobile"){await page.getByRole("button",{name:"Open navigation"}).click();await page.getByRole("link",{name:"Overview",exact:true}).click();await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();}
 });
}
