# P5 — Agent output quality

**Paste [`../GUIDE.md`](../GUIDE.md) first, then this file.**

Branch: `p5-output`. Medium priority, high visible payoff.

---

## The job

The finished website is the thing judges actually look at. It is currently *fine*. Fine is not
memorable, and this is the cheapest remaining win on the project.

## Files you own

```
mc/skills.py                what every agent produces — prompts and offline templates
config/agents.yaml          the `llm:` section only
```

**Nothing else.** Do not touch `mc/llm.py`, the trust code, or the Commander.

## Read this before you change the review

`review_site` has a **deterministic floor** and it exists for a reason. The demo's review loop
depends on a real finding — the first draft of the page genuinely has no allergen notice, and rule
checks genuinely catch it. A model alone turned that reliable beat into a coin flip.

So `_fallback_review` runs on **every** review and its findings are not negotiable. `merge_reviews`
adds the model's findings on top; the model can never remove a rule finding. Ten tests in
`tests/test_review.py` enforce this, including an approving model over a non-compliant page still
yielding `approved: false`.

**You may add rule checks. You may improve the model prompt. Do not let the model overrule a
rule.** If a test in `test_review.py` starts failing, the change is wrong, not the test.

## Task 1 — make the page genuinely good

`_render_site` builds a single self-contained HTML document. Constraints, all of which exist for a
reason:

- one file, inline CSS, no JavaScript, no external images
- Google Fonts allowed — keep using `_fonts_url()` so the page loads exactly the stylesheet the
  Guardian was asked to authorise. If those two drift apart, the permission becomes theatre.
- it renders inside `<iframe sandbox="">`, so nothing scripted will run anyway

Make it something you would be pleased to hand a real small business. Typography, spacing,
hierarchy, a hero that does not look like a template.

## Task 2 — better brand kits

`_fallback_brand` is the deterministic one and it is what the demo shows today. Better palettes,
better taglines, more plausible menu items. Keep the contrast strong — the compliance agent checks
accessibility basics and it would be embarrassing to fail our own review.

## Task 3 — sharpen the prompts

`BRAND_SYSTEM`, `SITE_SYSTEM`, `REVIEW_SYSTEM` and `PLAN_SYSTEM`. Tighter instructions, clearer
JSON shape, fewer ways to go wrong.

**You cannot test these against a real model yet** — the Gemini key we have belongs to a project
with zero generation quota (see `../GUIDE.md` §11). Someone is getting a working one. Write the
prompts so that a failure still lands on a good fallback, which is the right design regardless.

## Task 4 — a second look at the routing

`config/agents.yaml` has an `llm:` section deciding which work uses a model:

```yaml
mission.plan:      gemini
brand.identity:    gemini
site.generate:     offline    # the page is the artifact; the template never surprises us
compliance.review: gemini
```

`site.generate: offline` is deliberate — a model might hand you something ugly thirty seconds
before judging. If you make the model path reliably better, you may change it, but only after
seeing it produce a good page ten times in a row.

## Done when

- [ ] The generated page is something you would show a real business
- [ ] `pytest` passes — all 100, especially `tests/test_review.py`
- [ ] `python scripts/smoke_test.py` passes all five scenarios
- [ ] The review loop still fires every run: compliance finds the allergen gap, work goes back, gets fixed
- [ ] `_fonts_url()` is still the single source for the stylesheet URL

## Verify

```bash
pytest
python scripts/run_all.py --fresh
python scripts/smoke_test.py
```

Then open http://127.0.0.1:8000, run a mission, and actually look at the page it produced. That is
the only test that matters for this packet.

## Blocked?

- Want to see a Gemini result → the key is quota-blocked. Make the offline path excellent; that is
  what the demo runs on today anyway.
- A review test fails → you have let the model overrule a rule. Fix the change.
