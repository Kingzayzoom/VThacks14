# Brief: Agents, output quality and the demo

**Before anything: paste [`../onboarding.md`](../onboarding.md) into your AI assistant, then this
file.**

---

## Your job

Two halves, and they are the same job seen from two ends.

**Make the agents good.** They currently produce decent output from hardcoded templates. With a
Gemini key they can be genuinely impressive — but turning the model on carelessly breaks a demo
beat, and that trap is described below.

**Make the demo work.** Someone has to own the run-of-show: what gets typed, what gets clicked,
what gets said, how long it takes, and what happens when something breaks in front of judges.
That is you.

## What you own

```
mc/skills.py                 what each agent actually does — prompts and offline templates
mc/llm.py                    the Gemini wrapper and fallback behaviour
services/agents/vendor.py    the vendor runtime
scripts/smoke_test.py        the end-to-end assertion
docs/demo-script.md          yours to create
config/agents.yaml           the job_scopes and llm sections only
```

---

# Part 1 — Agents

## How it works now

Four places call a model, all through one helper (`mc/llm.py`):

| Caller | Produces |
|---|---|
| `plan_mission` (Commander) | business details + a task graph |
| `make_brand` (BrandStudio) | tagline, palette, fonts, tone, key offerings |
| `make_site` (site builders) | a complete one-page HTML document |
| `review_site` (LegalCheck) | compliance issues with severity and fixes |

Each has an offline template fallback, so the demo runs with no key at all. `LLM_MODE` is
currently global: `auto` (Gemini if a key exists) / `gemini` / `offline`.

**The failure behaviour is already right** and worth preserving: any Gemini error falls back to
templates, emits `llm.fallback`, and surfaces as `DEGRADED` on the integration status. An outage
mid-demo degrades visibly rather than crashing. Don't lose that.

## Task 1 — the trap, and the fix (do this first)

**Read this carefully, because it is easy to break and hard to notice.**

Your review-loop demo beat is *engineered*. `_render_site` deliberately omits the allergen notice
on the first draft. `_fallback_review` deterministically catches it. That is what triggers
*"compliance sent the work back for fixes"* — one of the best moments in the demo.

Turn Gemini on for both the site builder and the reviewer and that beat becomes a coin flip. The
model might write an allergen notice unprompted. Or review the page and approve it. **Two
"probably"s in a row is how demos die.**

The fix, in `review_site`: **always run the deterministic checks, and union them with the model's
findings.** The rules guarantee the beat; the model adds what a rule cannot express. It is also a
better product — *"our reviewer combines rule checks with a model"* beats either alone.

## Task 2 — per-capability LLM settings

`LLM_MODE` being global is too blunt. Add a per-capability setting in `config/agents.yaml`, and
default it like this:

| Who | Setting | Why |
|---|---|---|
| Commander (planning) | **gemini** | Free text → structure is the genuinely model-shaped task. Now that plans are real dependency graphs, this is where it pays off. |
| BrandStudio | **gemini** | Creative, subjective, cheap, and visible variety per run makes the demo feel alive. |
| Site builder | **offline** | The page is the visible artifact. The template is fast, polished, identical every time. A model might hand you something ugly thirty seconds before judging. |
| LegalCheck | **gemini + the floor above** | Reading a page for problems suits a model well. |

Global `LLM_MODE` should still override everything — `LLM_MODE=offline` must make the whole system
deterministic for rehearsals.

## Task 3 — make the artifact genuinely good

The finished website is the thing people look at. It is currently fine. Fine is not memorable.

`_render_site` in `mc/skills.py` is a single self-contained HTML document with inline CSS. Make it
something you would be pleased to show a real small business. Constraints: one file, inline CSS,
no JavaScript, no external images, Google Fonts allowed (and the Guardian already authorises that
fetch — keep using `_fonts_url` so the ask and the use stay in sync).

Same for the brand kit: better palettes, better taglines, more plausible menu items.

## Task 4 — get the key and verify

1. **aistudio.google.com** → sign in → **Get API key** → **Create API key**
2. `GEMINI_API_KEY=...` in `.env`
3. Run a mission; look for `brains: gemini` instead of `offline`

**Get two keys.** One for development, one *untouched* for Sunday. The free quota is easy to burn
on rehearsals and there is no way to un-burn it.

**Then verify the thing nobody has been able to test yet:** the planner has never run against a
real model. Type *"just make me a brand kit for a coffee shop"* — you should get a **one-job
mission**, not three. If you get three, the planner is being ignored and Zay needs to know
immediately.

---

# Part 2 — The demo

## Task 5 — write the run-of-show

Create `docs/demo-script.md`. Not a rough plan — the actual thing, with timings, so anyone on the
team can present it if the person who wrote it is debugging something.

Include:
- The exact mission text to type (rehearse with the exact string)
- Which scenario checkboxes are on
- Every click, in order, with what to say while it happens
- Where the human decisions land, and who clicks them
- Real measured timings, not guesses
- What to say if something fails — every failure has an honest reading, and the honest reading is
  usually more interesting than the happy path

The story arc the demo tells:

```
1. one sentence typed in
2. the Commander plans it and finds it has nobody for the first job
3. it searches ANS, finds candidates, runs the Trust Gate
4. an impostor bids and is refused — it cannot prove it holds the key
5. real agents are admitted, each with narrow scoped permission
6. one is revoked mid-job; its work is discarded and a replacement recruited
7. one ships a new version unannounced; the mission pauses for a human
8. one tries to send data off-site; the Guardian refuses before anything leaves
9. compliance sends the work back; it is fixed and re-reviewed
10. a finished, signed, provenanced website
```

## Task 6 — rehearse until it is boring

**Three clean runs on the actual presentation machine**, with that machine's network (or none).
Not your laptop. This catches more problems than any amount of code review.

```bash
python scripts/run_all.py --fresh      # --fresh before every real run
python scripts/smoke_test.py           # the whole thing, asserted, in a second terminal
```

Time it. `DEMO_PACE` in `.env` controls the deliberate pauses — `0` is fastest, `1.0` is the
default, `2.0` lets an audience follow. Tune it to the time you are given.

## Task 7 — failure drills

Deliberately break things and check the system tells the truth:

| Break | Should show |
|---|---|
| Kill an agent mid-mission | it drops off, a replacement is recruited |
| Kill the ANS simulator | checks report `unverified`, hires refused, nothing pretends to pass |
| Pull the network with Gemini on | `llm.fallback`, offline templates, `DEGRADED` — and the mission still finishes |
| Refuse the publish request | the action is blocked, the mission continues |
| Double-click every button | no duplicate missions, no double approvals |

Anything that lies under pressure is a bug worth more than a feature.

## Task 8 — judge questions

Have answers ready. The ones that will come:

- *"Is this real ANS or a simulation?"* — say exactly which, and that the cryptography is real
  either way. Never fudge this; it is the one answer that can cost you the track.
- *"Couldn't an agent just not ask the Guardian?"* — good question. Network actions go out
  *through* the Guardian, so there is no other path for those. For in-process actions in this
  demo, yes, the agents cooperate — and here is how you'd enforce it in production.
- *"You wrote the agent that misbehaves."* — yes, deliberately. A demo where permission is only
  ever granted teaches nobody anything. The *refusal* is not staged: the Guardian has no special
  knowledge of that request and the same rules would deny any agent.
- *"What does this actually prove?"* — that an agent is who it says it is, that it is in good
  standing right now, and that it acted inside permissions we granted. Not that its output is
  correct. Keep those separate and you sound rigorous rather than overclaiming.

## Done when

- [ ] Gemini on for planning, brand and review; site builder deterministic
- [ ] The deterministic review floor is in, and the review loop fires every single run
- [ ] A one-line mission produces a one-job plan with a real model
- [ ] The artifact is something you would show a real business
- [ ] `docs/demo-script.md` exists and someone other than you can present from it
- [ ] Three clean runs on the presentation machine
- [ ] Failure drills done; nothing lies under pressure
- [ ] A reserved, unused Gemini key for Sunday

## When you are blocked

- **Gemini returns something unusable** → that is what the fallbacks are for. Make the fallback
  good and the model a bonus, never the other way round.
- **A scenario stops firing** → run `python scripts/smoke_test.py`; it asserts each one and will
  tell you which broke.
- **You need the trust or Guardian code changed** → not your territory. Describe the behaviour to
  Zay.
- **Something feels dishonest** → say so. That instinct is worth more than the feature.
