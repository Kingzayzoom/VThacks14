import {test,expect} from "@playwright/test";

test("steady interface has no atmosphere loops and honors reduced motion",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 for(const route of ["/","/field","/agents"]){await page.goto(route);await expect(page.locator("canvas")).toHaveCount(0);expect(await page.locator("button").first().evaluate(el=>getComputedStyle(el).transitionDuration)).toBe("0s");}
 await page.getByRole("button",{name:"Inspect Guardian",exact:true}).click();
 await expect(page.getByLabel("Agent inspector",{exact:true})).toContainText("cannot grant its own permissions");
});

test("unavailable Canvas preserves composer and task selection",async({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext;});
 await page.goto("/");await page.getByText("Try an example",{exact:true}).click();await page.getByRole("button",{name:"Prepare a launch brief"}).click();await expect(page.locator("#objective")).toHaveValue(/Prepare a launch brief/);
 await page.getByRole("link",{name:"Enter workspace"}).click();await page.getByRole("button",{name:"Inspect Sage",exact:true}).click();await expect(page.locator("#selected-agent-details")).toContainText("Sage");
});
