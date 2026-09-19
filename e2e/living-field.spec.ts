import {test,expect} from "@playwright/test";

test("steady interface keeps Canvas absent and honors reduced motion",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 for(const route of ["/","/field","/agents"]){await page.goto(route);await expect(page.locator("canvas")).toHaveCount(0);expect(await page.locator("button").first().evaluate(el=>getComputedStyle(el).transitionDuration)).toBe("0s");}
 expect(await page.locator(".workspace-atmosphere").evaluate(el=>getComputedStyle(el,"::before").animationName)).toBe("none");
 await page.getByRole("button",{name:"Inspect Guardian",exact:true}).click();
 await expect(page.getByLabel("Agent inspector",{exact:true})).toContainText("cannot grant its own permissions");
});

test("one ambient layer pauses when hidden and stays static on mobile",async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.emulateMedia({reducedMotion:"no-preference"});
 await page.goto("/field");
 const atmosphere=page.locator(".workspace-atmosphere");
 await expect(atmosphere).toHaveCount(1);
 await expect(atmosphere).toHaveAttribute("aria-hidden","true");
 await expect(atmosphere).toHaveAttribute("data-paused","false");
 expect(await atmosphere.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe("none");
 expect(await atmosphere.evaluate(el=>getComputedStyle(el,"::before").animationPlayState)).toBe("running");
 // Synthetic lifecycle event: deterministic in headless Chromium, whose tabs
 // do not reliably background one another. Exercise the real subscription.
 await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"));});
 await expect(atmosphere).toHaveAttribute("data-paused","true");
 expect(await atmosphere.evaluate(el=>getComputedStyle(el,"::before").animationPlayState)).toBe("paused");
 await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});document.dispatchEvent(new Event("visibilitychange"));});
 await expect(atmosphere).toHaveAttribute("data-paused","false");
 await page.setViewportSize({width:390,height:844});
 expect(await atmosphere.evaluate(el=>getComputedStyle(el,"::before").animationName)).toBe("none");
 await page.getByRole("button",{name:"Review request",exact:true}).click();
 await expect(page.getByRole("dialog",{name:"Capability request"})).toBeVisible();
});

test("unavailable Canvas preserves composer and task selection",async({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext;});
 await page.goto("/");await page.getByText("Try an example",{exact:true}).click();await page.getByRole("button",{name:"Prepare a launch brief"}).click();await expect(page.locator("#objective")).toHaveValue(/Prepare a launch brief/);
 await page.getByRole("link",{name:"Enter workspace"}).click();await page.getByRole("button",{name:"Inspect Sage",exact:true}).click();await expect(page.locator("#selected-agent-details")).toContainText("Sage");
});
