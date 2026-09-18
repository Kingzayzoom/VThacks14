# Brief: Frontend

**Before anything: paste [`../onboarding.md`](../onboarding.md) into your AI assistant, then this
file, then [`../contracts.md`](../contracts.md).** Those three together are everything an
assistant needs to help you build this without reading the Python.

---

## Your job

Make the architecture legible in five seconds. A judge should be able to look at the screen
during the demo and understand, without narration, that agents were verified before they were
hired and constrained after they were.

You own **`dashboard/`** entirely — HTML, CSS, JS, framework choice, build step or none. Nobody
else will touch it.

## What you must not do

Do not call agents, the Commander, or ANS directly. **Everything goes through the hub on `:8000`.**
It is the only process allowed to hold credentials, and the only one whose shape we promise not
to change without updating the contract.

## Your contract

[`../contracts.md`](../contracts.md) is the complete list: every REST route, every WebSocket
event, every object shape. It is maintained as a promise — if a field you need is missing or
wrong, say so and it gets fixed, rather than working around it.

The pattern that works, and what the current dashboard does:

- **Poll** `/api/state`, `/api/missions/current`, `/api/guardian/incidents` for what is true now.
- **Subscribe** to `/ws` for what just happened — use events to trigger a refresh and to drive
  the activity feed.

Events tell you *something changed*; the REST call tells you *what it changed to*.

## The seven views, and the question each answers

| View | Answers |
|---|---|
| Mission graph | Who is working? |
| Trust Gate | Why was this agent allowed in? |
| Guardian | What is this agent allowed to do? |
| Recruitment drawer | What did we need, who did we find, who did we turn away? |
| Audit trail | What actually happened? |
| Proof viewer | What evidence supports that claim? |
| Artifact | What useful thing did we get? |

## The five things that must be unmistakable

These are where the design either carries the product or undermines it.

**1. Four states, not two.** An agent node must show four independent things. Collapsing them
into one green dot destroys the entire point.

```
identity:   VERIFIED     (passed the gate)
standing:   ACTIVE       (ANS says so, right now)
authority:  3 scopes     (what it may actually do)
runtime:    working      (what it is doing)
```

"Identity verified, permission denied" is a legitimate state. So is "verified, allowed, and it
crashed." Make both renderable.

**2. `unverified` is not `fail` and is never `pass`.** Trust Gate checks have four states:
`pass`, `fail`, `unverified`, `not_run`. `unverified` means *we could not get the evidence* — ANS
unreachable, no transparency log configured. It refuses the hire, but it is not the agent's
fault. Suggested: `fail` red, `unverified` amber reading "evidence unavailable", `not_run` grey.

**3. Show all five gate rows, always.** Including the ones that did not run. A gate that stopped
at check 2 with three rows greyed out says far more than one red banner:

```
01 RESOLVE       PASS   registered to BrandStudio · card fetched
02 AUTHENTICATE  FAIL   couldn't prove it holds this identity's private key
03 STATUS        PASS   ACTIVE · signed 4s ago (presented, verified offline)
04 CAPABILITY    PASS   offers brand.identity
05 POLICY        FAIL   offering from :8006, but ANS lists :8002
```

**4. Nothing appears on a timer.** A node appears because `agent.admitted` arrived. An edge
animates because work is actually running. If you cannot tie a piece of motion to an event, cut
it — a judge who asks "is that real?" and gets "no" has stopped listening.

**5. The result HTML is untrusted model output.** Render it in `<iframe sandbox="">`. Never
inject it into the page.

## Two numbers worth putting on screen

- **`age_seconds`** from the status check's standing evidence. *"Verified 3 seconds ago"* is a far
  stronger claim than *"verified"*, and it is the thing that makes offline verification visible.
- **`expires_at`** on a grant. Authority that expires is the whole idea of a mission-scoped grant.

## Two numbers *not* to invent

No trust percentages. No match scores. Every number on screen comes from a field in the contract.
If you want to show something we do not emit, ask for it — do not compute a plausible-looking one.

## Responsive

Desktop: the graph can dominate the centre, with an inspector on the right.

Mobile: do not squeeze the graph into 390px. The task list becomes the primary view, the graph
becomes a secondary full-screen view, approvals become bottom sheets. The Trust Gate must stay
readable — it is the thing people will screenshot.

## Getting it running

```bash
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python scripts/run_all.py --fresh
```

Dashboard at http://127.0.0.1:8000. No API keys needed — it runs fully offline.

Useful while building:
- **Reset demo** button, or `POST /api/reset` — clean slate between runs
- `DEMO_PACE=0` in `.env` — removes the deliberate pauses, runs fast
- `DEMO_PACE=2.0` — slows it down so you can watch a transition
- The chaos buttons on each agent card fire scenarios on demand

The existing `dashboard/` is plain HTML/CSS/JS with no build step. Keep it or replace it — your
call. If you replace it, the hub serves whatever is in that folder as static files, so a built
SPA needs its output there.

## Order I would build in

1. **Get the event stream rendering.** Connect to `/ws`, dump events to a list. Everything else
   is a view over this.
2. **Agent cards with the four states.** Small, high value, teaches you the data.
3. **The Trust Gate panel.** This is the signature view. Five rows, four states, evidence on click.
4. **Mission graph.** Nodes from `mission.jobs` and `mission.roster`, edges from `depends_on`.
5. **Guardian panel.** Incidents with allow/deny/needs-review, and the approve control.
6. **Recruitment drawer.** Driven by one `recruitment` object — candidates, refusals, requested
   scopes shown *before* the decision.
7. **Audit trail and proof viewer.** The event list, made inspectable.

Ship 1–3 before you polish anything. Those three carry the demo on their own.

## When you are blocked

- Field missing from the contract → ask, do not guess a shape.
- Something in the contract does not match reality → say so, it is a bug in the backend.
- Need a scenario to fire on demand → the chaos endpoints in the contract do that.
- Need the system in a specific state → `POST /api/reset`, then drive it with the chaos endpoints.
