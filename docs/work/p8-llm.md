# P8 — Make the agents actually think

**Paste [`../onboarding.md`](../onboarding.md) first, then this file.**

Branch: `p8-llm`. Blocked on one errand, then ~2 hours of work.

---

## The situation

**No agent in this project is currently using a language model.** Every mission runs on
hand-written deterministic templates.

```
last real mission ran with brains: ['offline']
Gemini component: DEGRADED — "Gemini unavailable (ClientError), used offline template"
```

The plumbing is complete and correct — per-capability routing, graceful fallback, honest
`DEGRADED` reporting. What is missing is a key that works.

**Two keys have been tried and both failed:**

| Key | Result |
|---|---|
| `AIza…6go` | Authenticates, lists 58 models, but its project has `quota_limit_value: '0'` — no generation quota was ever allocated |
| `AQ.Ab8…slQ` | `401 UNAUTHENTICATED` on all three auth mechanisms (query param, `x-goog-api-key`, Bearer) |

The second was transcribed from a photo with a mouse cursor sitting over a character, and its
`AQ.` prefix is not the usual `AIza` API-key format — so it is either mis-transcribed or not an
API key at all.

## Task 1 — get a key that generates (the errand)

1. **aistudio.google.com** → **Get API key** → **Create API key in a NEW project**.
   Choosing an existing project is what produced the zero-quota key.
2. Paste it as **text**, never a photo — `I`/`l`/`1` and `O`/`0` are indistinguishable, and a
   cursor can hide a character.
3. `GEMINI_API_KEY=...` in `.env` (gitignored).
4. Verify before anything else:

```bash
python -c "
import asyncio
from google import genai
from google.genai import types
from mc.config import env
c = genai.Client(api_key=env('GEMINI_API_KEY'))
print(len(list(c.models.list())), 'models')
r = asyncio.run(c.aio.models.generate_content(model='gemini-2.5-flash',
    contents='Reply only {\"ok\":true}',
    config=types.GenerateContentConfig(response_mime_type='application/json')))
print(r.text)"
```

If that prints JSON, you are unblocked. If it 429s with `quota_limit_value: '0'`, the key is from
the wrong kind of project — go back to step 1.

## Task 2 — verify the planner (the thing never tested)

Missions are planned as validated dependency graphs — one to six tasks, cycles rejected, a bounded
retry that feeds validation failures back to the model. **All of it is unit-tested against a
scripted model and has never run against a real one.**

The moment the key works:

```
"Just make me a brand kit for a coffee shop called Grind."
```

You should get a **one-job** mission. If you get three, the plan is being ignored and the planner
needs looking at — tell Zay immediately, it is his code.

Then try these and watch what the validator does:

- *"Build a website for my dog grooming business and run an SEO audit"* — SEO is outside our
  capability vocabulary. It should appear in `plan.unsupported` and be said out loud, not faked.
- Something deliberately vague. A plan that validates can still be a *bad* plan; that is a
  judgement no amount of checking makes for us, and it is worth seeing.

Watch for the retry making things worse rather than better. One retry, then the deterministic
plan — that limit exists for a reason.

## Task 3 — a second provider (the insurance)

Two dead keys in two days, on a free tier, the day before judging. Everything funnels through one
function — `generate_json()` in `mc/llm.py` — and only about twenty lines inside it are
Gemini-specific.

Add one more provider behind the same interface, selected by config. Roughly 30 lines plus a
setting. The routing table in `config/agents.yaml` and `LLM_MODE` already give you the switch.

Rules:
- **The fallback chain must stay honest.** Provider fails → next provider → offline template, each
  step emitting `llm.fallback` so the integration status still reports `DEGRADED`. Never let a
  failure look like a success.
- **No secret reaches the browser.** Server-side only, `.env` only.
- **Do not change the per-capability routing semantics.** `site.generate` stays offline on
  purpose: the page is the artifact a judge looks at and the template never surprises us.

## Files you own

```
mc/llm.py                    the provider layer
config/agents.yaml           the llm: section only
.env.example                 new provider keys, empty
```

**Do not touch** `mc/skills.py` — P5 owns prompts and templates. If a prompt needs changing to
work with a second provider, hand it to them.

## What must keep working

The fallback behaviour is already right and is a genuine demo asset. It has been tested for real:
with a configured-but-failing key, a full mission produced four `llm.fallback` events, reported
Gemini as `DEGRADED` with the actual reason, fell back to templates, and **delivered with all five
scenarios green**. Nothing pretended to work.

Do not regress that. A provider outage on Sunday should cost polish, not the demo.

## Done when

- [ ] A key generates; a mission reports `brains: ['gemini']`
- [ ] A one-line mission produces a one-job plan
- [ ] Out-of-scope work lands in `plan.unsupported` rather than being faked
- [ ] A second provider works behind the same interface
- [ ] Killing the network mid-mission still finishes, still reports `DEGRADED`
- [ ] `pytest` (122) and `scripts/smoke_test.py` both pass with and without a key
- [ ] A second, unused key is reserved for Sunday

## Blocked?

- **Every key fails** — check the project, not the code. `quota_limit_value: '0'` means the
  project has no allocation; a 401 means the string is wrong.
- **Want to test without burning quota** — `LLM_MODE=offline` makes everything deterministic.
