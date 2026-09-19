# P2 — Trust Gate, Guardian and Recruitment views

**Paste [`../GUIDE.md`](../GUIDE.md) first, then this file.**

Branch: `p2-views`. Critical path.

---

## The job

The backend proves things no screen currently shows. Three views are missing, and they are the
three that make the product legible:

| View | The question it answers |
|---|---|
| **Trust Gate** | Why was this agent allowed in? |
| **Guardian** | What is it allowed to do, and what did we stop? |
| **Recruitment** | What did we need, who did we find, who did we turn away? |

Build them as **new files only**. Nothing you need is in someone else's file.

## Files you own — all new

```
src/components/trust/**                 the five-row gate panel
src/components/guardian/**              incidents, decisions, the approve control
src/components/recruitment/**           the capability-deficit drawer
src/app/(workspace)/guardian/page.tsx   new route
src/app/(workspace)/events/page.tsx     new route — audit trail + proof viewer
src/styles/trust.css  guardian.css      if you need them
```

**Do not edit** `provider.tsx`, `src/lib/api/**` (P1 owns those), or existing components. You may
*read* `useControl()`. If an existing page needs a link to your new route, note it and hand it to
whoever owns that file rather than editing it.

## You are not blocked on P1

P1 is wiring live data in parallel. You do not wait for them: **[`fixtures/`](fixtures/) contains
real captured output from a full demo run.** Not invented shapes — actual JSON off the wire.

```
fixtures/events-by-type.json     one example of each of the 32 event types
fixtures/events.json             95 events from one mission, in order
fixtures/mission.json            plan, jobs, hires, recruitments, roster, stats
fixtures/guardian-incidents.json allowed / denied / needs-review, with full decisions
fixtures/guardian-grants.json    live scoped grants with expiries
fixtures/state.json              every agent: ANS name, version, status, fingerprint
```

Import them directly while you build. When P1 lands, the same shapes arrive live and your views
keep working.

## The Trust Gate view — the signature screen

This is the one people will screenshot. Data comes from `trust.check` events:

```js
data.verdict = "TRUSTED" | "REJECTED" | "NEEDS_APPROVAL"
data.checks  = [{ name, ok, state, detail, evidence }, ...]   // always five
data.source  = "ANS registry" | "open-web offer" | "incoming job"
```

**Render all five rows, always — including the ones that did not run.** A gate that stopped at
check 2 with three rows greyed out says far more than one red banner:

```
01 RESOLVE       PASS   registered to BrandStudio · card fetched
02 AUTHENTICATE  FAIL   couldn't prove it holds this identity's private key
03 STATUS        PASS   ACTIVE · signed 4s ago (presented, verified offline)
04 CAPABILITY    PASS   offers brand.identity
05 POLICY        FAIL   offering from :8006, but ANS lists :8002
```

### `state` has four values and this is the part to get right

```
pass        the evidence says yes
fail        the evidence says no
unverified  we could not obtain the evidence
not_run     an earlier check failed, so we stopped
```

`unverified` refuses the hire but is **not the agent's fault** — it means ANS was unreachable or a
proof was unavailable. Draw `fail` red, `unverified` amber reading "evidence unavailable",
`not_run` grey. **Never draw `unverified` as a pass.** That rule is the product.

### Two things worth surfacing

The `status` check's evidence carries two *independent* proofs, and the distinction is the most
sophisticated thing the backend does:

```js
evidence.inclusion  // proves it was registered. Still true after a revocation — forever.
evidence.standing   // proves it is in good standing NOW. Short-lived, signed, re-checked.
                    // has age_seconds and source: "presented by the agent" | "fetched from the registry"
```

Show `standing.age_seconds`. *"Verified 3 seconds ago"* is a far stronger claim than *"verified"*,
and `source: "presented by the agent"` is what makes offline verification visible.

## The Guardian view

From `fixtures/guardian-incidents.json` and `GET /api/guardian/incidents`:

```js
{ state: "ALLOWED" | "DENIED" | "NEEDS REVIEW",
  org, action, resource, destination, purpose, payload_sha256,
  decision: { outcome, reason, required_scope, granted_scopes[], rules[] },
  grant: { scopes[], expires_at } | null,
  result: { performed, detail } | null,
  approval_id }          // present only when NEEDS REVIEW
```

Three things to make obvious:

- **Why** it was refused — `decision.reason` in plain words, plus `required_scope` against
  `grant.scopes` so the gap is visible.
- **`NEEDS REVIEW` is interactive.** An agent is blocked, waiting on a person. Show approve and
  refuse buttons wired to `POST /api/guardian/incidents/{id}/decision`. It expires after 180s and
  silence counts as no.
- **Grants expire.** Show `expires_at`. Authority that lapses is the whole idea.

## The Recruitment drawer

One `recruitment` object out of `mission.recruitments[]` drives the whole panel:

```js
{ capability, status, candidates[], rejected[{ans_name, org, failed_check, reason}],
  selected, replacing: {org, reason} | null, requested_scopes[], granted_scopes[] }
```

Two details that make it land:

- **`requested_scopes` is populated before admission.** You can show what an agent is *asking for*
  while the decision is still open. That is the best moment in the drawer.
- **`replacing` distinguishes a backfill from a cold start.** `capability.missing` means we never
  had anyone; `recruitment.replacement_requested` means we had someone and lost them. They should
  not look the same.

Keep the `rejected` list visible. Who we turned away is as much the story as who we hired.

## The events / audit route

The event stream, made inspectable. 32 types in `fixtures/events-by-type.json`. Each row expands
to its raw `data` — that is the proof viewer. **Render unknown event types as their `message` and
move on**; new types ship without warning and must never break the feed.

## Non-negotiables

1. **No invented numbers.** No trust percentages, no match scores. Every number comes from a field.
2. **Nothing on a timer.** A row appears because an event arrived.
3. **Mobile: the Trust Gate must stay readable.** It is the thing people photograph.

## Done when

- [ ] Trust Gate renders all five rows with four distinct states, `unverified` visibly not a pass
- [ ] The impostor's gate run is legible at a glance as two independent failures
- [ ] Guardian shows allowed, denied and needs-review; the approve control works
- [ ] Recruitment shows candidates, refusals and requested scopes before the decision
- [ ] Events route lists all 32 types without crashing and expands to raw evidence
- [ ] `npm run typecheck && npm run build` clean

## Blocked?

- Need live data → you do not. Use `fixtures/`; the shapes are real.
- A field you want does not exist → say so rather than deriving something plausible.
- Need to edit an existing component → hand the change over instead; that is someone else's file.
