import {test,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const captures="docs/screenshots/finish";

test("objective validation, idempotent submission, reload and draft retention",async({page})=>{
 fs.mkdirSync(captures,{recursive:true});await page.goto("/");await page.getByRole("button",{name:"Start mission"}).click();await expect(page.locator("#composer-error")).toHaveText("Describe an objective to begin.");await page.screenshot({path:`${captures}/objective-error.png`});
 await page.getByLabel("Your objective").fill("Plan our demo rehearsal.");await page.getByLabel("Your objective").press("Control+Enter");await expect(page).toHaveURL(/\/missions\/demo-/);await expect(page.getByRole("heading",{name:"Mission detail",exact:true})).toBeVisible();
 await page.reload();await expect(page.locator(".mission-overview .objective-copy")).toHaveText("Plan our demo rehearsal.");
 await page.getByRole("button",{name:"New mission",exact:true}).click();const dialog=page.getByRole("dialog",{name:"New mission"});
 await dialog.getByLabel("Your objective").fill("Keep this unsent draft");await page.keyboard.press("Escape");await page.getByRole("button",{name:"Voice connection information"}).click();await page.getByRole("button",{name:"Use text instead"}).click();await expect(dialog.getByLabel("Your objective")).toHaveValue("Keep this unsent draft");await expect(dialog.getByLabel("Your objective")).toBeFocused();
 await dialog.getByText("Try an example",{exact:true}).click();await dialog.getByRole("button",{name:"Plan a research project"}).click();await expect(dialog.getByLabel("Your objective")).toBeFocused();await dialog.getByRole("button",{name:"Start mission"}).dblclick();await expect(dialog).not.toBeVisible();await page.getByRole("link",{name:"Missions",exact:true}).click();await expect(page.locator(".mission-row")).toHaveCount(3);
});

for(const [size,viewport] of Object.entries({desktop:{width:1440,height:900},mobile:{width:390,height:844}})){
 test(`entry, overview, detail, review and settings at ${size}`,async({page})=>{
 test.setTimeout(120000);fs.mkdirSync(captures,{recursive:true});await page.setViewportSize(viewport);
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 for(const [name,route] of [["entry","/"],["overview","/field"],["mission-detail","/missions/demo-001"],["missions","/missions"],["settings","/settings"]]){
 await page.goto(route);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${captures}/${name}-${size}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
 }
 await page.goto("/field");await expect(page.getByText("1 of 3 complete")).toBeVisible();await page.getByRole("button",{name:"Inspect Sage",exact:true}).click();await expect(page.locator("#selected-agent-details")).toContainText("dataset.read:public-demo");await expect(page.locator("#selected-agent-details")).toContainText("Demo verification only");await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:"Inspect Sage",exact:true})).toBeFocused();
 await page.getByRole("button",{name:"Pause demo mission"}).click();await expect(page.getByRole("button",{name:"Inspect Sage",exact:true})).toContainText("Paused");await page.getByRole("button",{name:"Resume demo mission"}).click();await expect(page.getByRole("button",{name:"Inspect Sage",exact:true})).toContainText("Running");
 await page.getByRole("button",{name:"Review request",exact:true}).click();await expect(page.getByRole("dialog",{name:"Capability request"})).toContainText("No candidate verified");await page.screenshot({path:`${captures}/review-${size}.png`});await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:"Review request",exact:true})).toBeFocused();
 if(size==="mobile"){await page.getByRole("button",{name:"Open navigation"}).click();await expect(page.getByRole("button",{name:"Close navigation"})).toBeFocused();await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:"Open navigation"})).toBeFocused();}
 expect(errors).toEqual([]);
 });
}

test("wide layouts, missing mission and empty search remain useful",async({page})=>{
 for(const width of [1920,1280]){await page.setViewportSize({width,height:width===1920?1080:900});await page.goto("/field");await expect(page.getByRole("button",{name:"Review request",exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`${captures}/overview-${width}.png`});
 for(const route of ["missions","agents"]){await page.goto(`/${route}`);await page.screenshot({path:`${captures}/${route}-${width}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}}
 await page.goto("/missions/not-on-this-device");await expect(page.getByRole("heading",{name:"Mission not found on this device."})).toBeVisible();await page.screenshot({path:`${captures}/missing-mission.png`});await expect(page.getByRole("link",{name:"Create mission"})).toHaveAttribute("href","/");
 await page.goto("/agents");await page.getByLabel("Search agents",{exact:true}).fill("no matches");await page.screenshot({path:`${captures}/empty-search.png`});await page.getByRole("button",{name:"Clear filters"}).click();await expect(page.locator(".constellation-roster-row")).toHaveCount(7);
});
