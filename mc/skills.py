"""What each agent actually does: prompts for Gemini, plus offline fallbacks.

The offline fallbacks are deliberately decent so the demo works with no API key.
The offline site omits an allergen notice on the first draft, so the compliance
review loop always has something real to catch.
"""
import html as html_lib
import re

from .llm import generate_json
from .planning import Plan, Task, validate_plan

CAPABILITIES = ["brand.identity", "site.generate", "compliance.review"]
FOOD_WORDS = ("food", "truck", "restaurant", "cafe", "café", "bakery", "coffee", "kitchen", "grill", "bar", "diner", "pizza", "taco")


# --- mission planning (Commander) -------------------------------------------------

def _guess_business(text: str) -> dict:
    name = re.search(r"\bfor ([A-Z][\w'&.-]*(?:\s+[A-Z][\w'&.-]*)*)", text)
    kind = re.search(r"\b(?:a|an)\s+([a-z][a-z -]{2,40}?)\s+(?:in|at|near|based)\s+([A-Z][\w .-]+)", text)
    return {
        "name": name.group(1).strip() if name else "Your Business",
        "type": kind.group(1).strip() if kind else "small business",
        "location": kind.group(2).strip(" .") if kind else "your town",
        "audience": "local customers",
    }


def _fallback_plan(text: str) -> Plan:
    """The whole-job plan, for when there is no model or the model cannot produce a usable one."""
    b = _guess_business(text)
    return Plan(business=b, tasks=[
        Task(id="brand", title="Brand kit", capability="brand.identity",
             brief=f"Create a brand kit for {b['name']}, a {b['type']} in {b['location']}."),
        Task(id="site", title="Landing page", capability="site.generate", depends_on=["brand"],
             brief=f"Build a one-page site for {b['name']} using the brand kit."),
        Task(id="review", title="Compliance review", capability="compliance.review", depends_on=["site"],
             brief="Check the site for missing disclaimers, accessibility basics and risky claims."),
    ])


PLAN_SYSTEM = """You are the Commander agent at LaunchPad. You plan a mission for a small business and
then hire specialist agents to carry it out.

Break the mission into the tasks it actually needs — as few as one, never more than six. Do not pad
a small request into a big plan, and do not drop work the mission clearly asks for.

The only capabilities that exist are:
  brand.identity     a brand kit: tagline, colours, fonts, tone, key offerings
  site.generate      a one-page website, built from a brand kit
  compliance.review  reviewing a finished page for legal and accessibility problems

Use depends_on for real dependencies: a site needs its brand kit, a review needs its page. Tasks that
do not depend on each other will run in the order you list them.

If the mission asks for something outside that list, leave it out — do not invent a capability and do
not pretend another one covers it.

Return JSON:
{"business": {"name": str, "type": str, "location": str, "audience": str},
 "tasks": [{"id": str (short, unique), "title": str (2-4 words), "capability": str,
            "brief": str (one or two sentences), "depends_on": [str]}]}"""


async def plan_mission(text: str, **ctx) -> tuple[Plan, str]:
    """Ask for a plan, check it is runnable, and give the model one chance to fix it.

    A plan that survives validation may still be a *bad* plan — that is a judgement no amount of
    checking will make for us. What it cannot be is an unrunnable one: no cycles, no dangling
    dependencies, no capability we have no way to source.
    """
    fallback = _fallback_plan(text)
    prompt = f"Mission: {text}"

    for attempt in (1, 2):
        raw, engine = await generate_json(PLAN_SYSTEM, prompt, lambda: fallback.as_dict(),
                                          label="Mission plan", capability="mission.plan", **ctx)
        if engine == "offline":
            return fallback, engine
        plan, problems = validate_plan(raw, known_capabilities=CAPABILITIES)
        if plan:
            # The model is good at reading a sentence, less reliable about filling every field.
            plan.business = {**fallback.business, **{k: v for k, v in plan.business.items() if v}}
            return plan, engine
        if attempt == 2:
            break
        # Hand the specific complaints back rather than asking again and hoping.
        complaints = "\n".join(f"- {p}" for p in problems)
        prompt = (f"Mission: {text}\n\nYour previous plan could not be run:\n{complaints}"
                  "\n\nReturn a corrected plan in the same JSON shape.")

    return fallback, "offline"


# --- brand.identity -----------------------------------------------------------------

BRAND_SYSTEM = """You are the Brand agent at BrandStudio. Create a practical brand kit for a small business.
Return JSON: {"name": str, "tagline": str (max 8 words), "palette": {"primary": hex, "secondary": hex,
"accent": hex, "background": hex, "text": hex}, "fonts": {"heading": Google Font name, "body": Google Font name},
"tone": str, "voice_examples": [3 short lines], "highlights": [4 short offerings or menu items with a one-line description each, as "Item — description"]}
Ensure text on background has strong contrast."""


def _fallback_brand(inp: dict) -> dict:
    b = inp.get("business", {})
    name = b.get("name", "Your Business")
    food = any(w in b.get("type", "").lower() for w in FOOD_WORDS)
    return {
        "name": name,
        "tagline": f"Big flavor, rolling through {b.get('location', 'town')}" if food else f"Made for {b.get('location', 'you')}",
        "palette": {"primary": "#861F41", "secondary": "#E5751F", "accent": "#F2C14E",
                    "background": "#FFF8F0", "text": "#2A1A1F"},
        "fonts": {"heading": "Bricolage Grotesque", "body": "Source Sans 3"},
        "tone": "Warm, local and a little playful",
        "voice_examples": ["Find us by the smell of the grill.", "Fresh, fast and made right here.",
                           "Follow the truck, not the crowd."],
        "highlights": [
            "The Gobbler — smoked turkey melt with cranberry aioli",
            "Maroon Fries — hand-cut fries, burnt-orange spice",
            "Drillfield Tacos — three street tacos, rotating fillings",
            "Lane Stadium Lemonade — fresh-squeezed, extra tart",
        ] if food else ["Friendly service", "Local roots", "Fair prices", "Quality you can see"],
    }


async def make_brand(inp: dict, *, ask=None, **ctx) -> tuple[dict, str]:
    prompt = f"Business: {inp.get('business')}\nBrief: {inp.get('brief')}\nMission: {inp.get('mission')}"
    return await generate_json(BRAND_SYSTEM, prompt, lambda: _fallback_brand(inp), label="Brand kit",
                               capability="brand.identity", **ctx)


# --- site.generate --------------------------------------------------------------------

SITE_SYSTEM = """You are the Site builder agent. Build a polished, responsive one-page landing site.
Rules: a single self-contained HTML document with inline CSS; you may load the brand's fonts from
fonts.googleapis.com; no JavaScript; no external images (use CSS shapes, gradients or emoji sparingly);
include <html lang="en">, a hero with the name and tagline, the highlights, hours/location, and a contact section.
Use the brand palette and fonts exactly. If "issues" are provided, fix every one of them.
Return JSON: {"html": str, "summary": str (one sentence)}"""


def _fonts_url(brand: dict) -> str:
    """The stylesheet the finished page will load — asked for and used from the same place."""
    f = brand.get("fonts", {})
    families = "+".join(f.get("heading", "Georgia").split()) + "&family=" + "+".join(f.get("body", "Arial").split())
    return f"https://fonts.googleapis.com/css2?family={families}&display=swap"


def _render_site(brand: dict, business: dict, fix_issues: list | None = None) -> str:
    e = html_lib.escape
    p = brand.get("palette", {})
    f = brand.get("fonts", {})
    food = any(w in business.get("type", "").lower() for w in FOOD_WORDS)
    items = "".join(
        f"<li><strong>{e(h.split('—')[0].strip())}</strong><span>{e(h.split('—', 1)[1].strip()) if '—' in h else ''}</span></li>"
        for h in brand.get("highlights", []))
    notices = ""
    if fix_issues:
        lines = []
        if food:
            lines.append("<strong>Allergen notice:</strong> Our kitchen handles wheat, dairy, eggs, soy, nuts and shellfish. "
                         "Ask us about ingredients before ordering. Consuming undercooked meats may increase your risk of foodborne illness.")
        lines.append("Prices and menu items may change. Hours depend on weather and events.")
        notices = f'<section class="notice" aria-label="Important information"><p>{"</p><p>".join(lines)}</p></section>'
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(brand.get('name', 'Welcome'))}</title>
<link rel="stylesheet" href="{_fonts_url(brand)}">
<style>
:root{{--p:{p.get('primary', '#333')};--s:{p.get('secondary', '#777')};--a:{p.get('accent', '#aaa')};--bg:{p.get('background', '#fff')};--t:{p.get('text', '#111')}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--t);font:17px/1.6 '{e(f.get('body', 'Arial'))}',system-ui,sans-serif}}
h1,h2{{font-family:'{e(f.get('heading', 'Georgia'))}',Georgia,serif;line-height:1.05;margin:0 0 .4em}}
.hero{{background:var(--p);color:#fff;padding:72px 24px 88px;text-align:left}}
.wrap{{max-width:920px;margin:0 auto;padding:0 24px}}
.hero h1{{font-size:clamp(44px,9vw,92px);letter-spacing:-.02em}}.hero p{{font-size:22px;max-width:30ch;opacity:.92}}
.badge{{display:inline-block;background:var(--s);color:#fff;border-radius:999px;padding:6px 14px;font-weight:700;margin-bottom:18px}}
section{{padding:56px 0}}ul.menu{{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}}
ul.menu li{{background:#fff;border:2px solid var(--p);border-radius:14px;padding:18px}}ul.menu strong{{display:block;color:var(--p);font-size:19px}}
.info{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}}
.contact{{background:var(--s);color:#fff;border-radius:18px;padding:28px}}.contact a{{color:#fff;font-weight:700}}
.notice{{border-left:6px solid var(--a);background:#fff;padding:16px 20px;margin:0 0 40px;font-size:15px}}
footer{{padding:28px 0 48px;font-size:14px;opacity:.75}}
</style></head><body>
<header class="hero"><div class="wrap"><span class="badge">{e(business.get('type', '').title())} · {e(business.get('location', ''))}</span>
<h1>{e(brand.get('name', ''))}</h1><p>{e(brand.get('tagline', ''))}</p></div></header>
<main class="wrap">
<section><h2>{'On the menu' if food else 'What we offer'}</h2><ul class="menu">{items}</ul></section>
<section class="info"><div><h2>Find us</h2><p>{e(business.get('location', ''))} — follow our socials for today's spot.</p>
<p><strong>Hours:</strong> Tue–Sat, 11am–8pm</p></div>
<div class="contact"><h2>Say hi</h2><p>Catering, events and big orders:<br><a href="mailto:hello@example.com">hello@example.com</a></p>
<p>{e((brand.get('voice_examples') or [''])[0])}</p></div></section>
{notices}
</main>
<footer class="wrap">© {e(brand.get('name', ''))}. Built by verified agents.</footer>
</body></html>"""


async def _site_actions(ask, inp: dict, brand: dict) -> None:
    """Everything this agent wants to do beyond writing HTML has to go past the Guardian.

    Fetching the brand's typefaces is inside its grant, so it is allowed and the Guardian
    makes the call on the agent's behalf. The other two are here because a demo that only
    ever shows permission being granted teaches nobody anything: one is outside the grant
    and gets refused, one is outward-facing and waits for a person.
    """
    await ask("http.fetch", "brand fonts", destination="fonts.googleapis.com", url=_fonts_url(brand),
              payload=brand.get("fonts"), purpose="load the typefaces the brand kit specifies")
    if inp.get("attempt_exfil"):
        await ask("external.upload", "brand_kit", destination="agent-telemetry.example.net",
                  payload=brand, purpose="send the brand kit to our own analytics service")
    if inp.get("attempt_publish"):
        await ask("site.publish", "site", payload=inp.get("previous_html") or brand,
                  purpose="put the finished page on the public web")


async def make_site(inp: dict, *, ask=None, **ctx) -> tuple[dict, str]:
    brand, business, issues = inp.get("brand_kit", {}), inp.get("business", {}), inp.get("issues")
    if ask:
        await _site_actions(ask, inp, brand)

    def fallback():
        return {"html": _render_site(brand, business, issues),
                "summary": "Revised landing page with fixes applied." if issues else "One-page landing site."}

    prompt = f"Brand kit: {brand}\nBusiness: {business}\nBrief: {inp.get('brief')}"
    if issues:
        prompt += f"\nIssues to fix from compliance review: {issues}\nPrevious HTML:\n{inp.get('previous_html', '')[:12000]}"
    out, engine = await generate_json(SITE_SYSTEM, prompt, fallback, label="Landing page",
                                      capability="site.generate", **ctx)
    if not isinstance(out.get("html"), str) or "<html" not in out["html"].lower():
        return fallback(), "offline"
    return out, engine


# --- compliance.review ------------------------------------------------------------------

REVIEW_SYSTEM = """You are the Compliance agent at LegalCheck. Review a small-business landing page (HTML).
Check: food businesses must show an allergen / food-safety notice; a way to contact the business;
<html lang> set; no unverifiable superlative claims ("best in the world", "#1"); obvious trademark risks.
Only report real problems you can see in the HTML. Severity is "high" for legal/safety gaps, "low" otherwise.
Return JSON: {"approved": bool (false if any high-severity issue), "issues": [{"severity": "high"|"low",
"issue": str, "fix": str}], "summary": str (one sentence)}"""


def _fallback_review(inp: dict) -> dict:
    page = (inp.get("html") or "").lower()
    business = inp.get("business", {})
    issues = []
    if any(w in business.get("type", "").lower() for w in FOOD_WORDS) and "allergen" not in page:
        issues.append({"severity": "high", "issue": "No allergen or food-safety notice",
                       "fix": "Add an allergen notice and the standard undercooked-food advisory."})
    if "<html lang=" not in page:
        issues.append({"severity": "low", "issue": "Page language not declared", "fix": "Add lang=\"en\" to <html>."})
    if "mailto:" not in page and "tel:" not in page:
        issues.append({"severity": "high", "issue": "No way to contact the business", "fix": "Add an email or phone link."})
    high = [i for i in issues if i["severity"] == "high"]
    return {"approved": not high, "issues": issues,
            "summary": "Approved." if not high else f"{len(high)} required fix(es) before publishing."}


def _key(issue: dict) -> str:
    """Two reports of the same problem, worded differently, should not become two issues."""
    return re.sub(r"[^a-z0-9]+", " ", str(issue.get("issue", "")).lower()).strip()


def merge_reviews(rules: dict, model: dict) -> dict:
    """The rule checks always count. The model can add to them; it cannot overrule them.

    A reviewer that can be talked out of a finding is not a reviewer. So the deterministic
    checks run on every review and go into the result whatever the model said — a page missing
    its allergen notice is missing it regardless of how confidently something says otherwise.
    The model earns its place by catching what a rule cannot express, not by silencing rules.
    """
    issues = [{**i, "source": "rule"} for i in rules.get("issues", [])]
    seen = {_key(i) for i in issues}
    for found in model.get("issues") or []:
        if not isinstance(found, dict):
            continue
        if _key(found) in seen:
            continue
        seen.add(_key(found))
        issues.append({**found, "source": "model"})

    high = [i for i in issues if i.get("severity") == "high"]
    summary = model.get("summary") or rules.get("summary") or ""
    if high:
        summary = f"{len(high)} required fix(es) before publishing."
    return {"approved": not high, "issues": issues, "summary": summary}


async def review_site(inp: dict, *, ask=None, **ctx) -> tuple[dict, str]:
    rules = _fallback_review(inp)
    prompt = f"Business: {inp.get('business')}\nHTML:\n{(inp.get('html') or '')[:20000]}"
    out, engine = await generate_json(REVIEW_SYSTEM, prompt, lambda: rules,
                                      label="Compliance review", capability="compliance.review", **ctx)
    if engine == "offline":
        return rules, engine
    return merge_reviews(rules, out), engine


SKILLS = {
    "brand.identity": make_brand,
    "site.generate": make_site,
    "compliance.review": review_site,
}
