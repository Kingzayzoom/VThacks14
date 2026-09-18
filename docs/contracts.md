# Frontend contract

Everything the dashboard needs, and nothing it has to guess.

**One rule: talk to the hub on `:8000` and nothing else.** Never call an agent, the Commander or
ANS directly. The hub is the only process that is allowed to hold credentials, and it is the only
one whose shape we promise not to change without updating this file.

Two ways to get state, and you will want both:

- **Poll** `/api/state`, `/api/missions/current` and `/api/guardian/incidents` for *what is true now*.
- **Subscribe** to `/ws` for *what just happened*. Use it to trigger a refresh and to drive the feed.

The existing dashboard polls every 2–6s and refreshes immediately on relevant events. Copy that
pattern: events tell you something changed, the REST call tells you what it changed to.

---

## REST

| Method | Path | Returns |
|---|---|---|
| GET | `/api/state` | agents, backend names, pace — the top-of-page state |
| POST | `/api/missions` | start a mission → the mission object |
| GET | `/api/missions/current` | `{mission: <mission>\|null}` |
| GET | `/api/missions/{id}` | one mission object |
| GET | `/api/missions/{id}/result` | the finished site, as **HTML** (render in a sandboxed iframe) |
| POST | `/api/missions/{id}/decision` | `{decision: "approve"\|"reject"}` — the version-upgrade pause |
| GET | `/api/guardian/incidents?limit=` | every action an agent asked to take, and the answer |
| POST | `/api/guardian/incidents/{id}/decision` | `{decision: "approve"\|"reject"}` — authorize once |
| GET | `/api/guardian/grants?mission_id=` | who currently holds what authority |
| GET | `/api/log?limit=` | the ANS transparency log |
| GET | `/api/receipt/{index}` | `{verified, detail, receipt}` — proof an entry is in the signed log |
| GET | `/api/offers?capability=` | unverified open-web offers (this is where the impostor bids) |
| GET | `/api/integrations/status` | what is actually working, probed live |
| GET | `/api/dns` | the simulated DNS zone |
| POST | `/api/reset` | back to a clean demo |
| POST | `/api/chaos/revoke/{key}` | revoke a vendor in ANS |
| POST | `/api/chaos/upgrade/{key}` | make a vendor ship a new version |
| POST | `/api/chaos/impostor` | send the impostor to bid |

Errors are `{"detail": "..."}` with a normal HTTP status. `409` means "not now" (a mission is already
running, a decision was already made), not "broken".

**Not for the frontend:** `POST /events`, `POST /api/guardian/grants`, `POST /api/guardian/actions`.
Those require an ANS identity signature and will refuse you with `403`.

---

## WebSocket

Connect to `/ws`. The first frame is the backlog, every frame after is one event:

```js
{ kind: "history", events: [ <event>, ... ] }   // sent once, on connect
{ kind: "event",   event: <event> }             // one per event, thereafter
```

Reconnect on close — the history frame replays state, so a dropped socket is not a lost session.
The existing client retries after 1.5s.

### Event envelope

```js
{
  id: "9f2c71a0be44",                  // stable, unique
  ts: "2026-09-18T20:15:07.412+00:00", // ISO 8601, UTC, milliseconds
  type: "trust.check",
  message: "Trusted: ans://v1.0.0.brand.brandstudio.xyz",  // human-readable, safe to render raw
  actor: "ans://v1.0.0.commander.launchpad.xyz",           // who did it (ANS name, or "guardian"/"owner")
  subject: "ans://v1.0.0.brand.brandstudio.xyz",           // who it was about, may be null
  mission_id: "m_870b93dc",                                // may be null
  data: { ... }                                            // per-type, see below
}
```

**Render unknown `type` values as `message` and move on.** New event types ship without warning;
an unrecognised one must never break the feed. There are no sequence numbers — order is arrival
order, and duplicates don't happen on a single hub.

**Nothing in an event is secret.** No keys, no tokens, no PATs. If you ever see one, that's a bug —
tell me.

---

## Events

### Mission
| type | when | useful `data` |
|---|---|---|
| `mission.started` | objective accepted | — |
| `mission.planned` | plan exists | `jobs[]`, `engine` |
| `mission.revision` | compliance sent work back | `issues[]` |
| `mission.delivered` | done | `stats`, `orgs[]` |
| `mission.failed` | gave up | — |

### Hiring and trust
| type | when | useful `data` |
|---|---|---|
| `capability.missing` | nobody on the roster can do this job, and we never had anyone | `capability`, `job`, `roster[]` |
| `capability.covered` | we already have someone, no recruitment needed | `capability`, `ans_name`, `org` |
| `discovery.started` | looking | `capability`, `sources[]` |
| `discovery.candidate_found` | one per candidate | `ans_name`, `org`, `version`, `capabilities[]`, `source`, `pitch` |
| `discovery.completed` | search done | `capability`, `count` |
| `discovery.failed` | nobody found | `capability` |
| `trust.check` | a Trust Gate run finished | `verdict`, `checks[]`, `source`, `endpoint`, `capability` |
| `agent.admitted` | passed, hired | `ans_name`, `org`, `granted_scopes[]` |
| `agent.rejected` | failed the gate | `ans_name`, `failed_check`, `reason` |
| `agent.unavailable` | dropped mid-mission — revoked, changed version, or stopped answering | `ans_name`, `org`, `capability`, `reason` |
| `recruitment.replacement_requested` | we *had* someone for this and lost them; backfilling | `replacing: {ans_name, org, reason}`, `capability`, `recruitment_id` |
| `approval.required` | version changed, mission paused | `org`, `version`, `approved_version`, `reason` |
| `approval.decided` | you answered | `decision` |

`trust.check` is the one to build the Trust Gate panel on:

```js
data.verdict = "TRUSTED" | "REJECTED" | "NEEDS_APPROVAL"
data.checks  = [ { name: "resolve"|"authenticate"|"status"|"capability"|"policy",
                   ok: true | false | null,     // the yes/no the mission acted on
                   state: "pass"|"fail"|"unverified"|"not_run",
                   detail: "registered to BrandStudio · card fetched",
                   evidence: { ... } } ]        // per check; safe to display, never secret
data.source  = "ANS registry" | "open-web offer" | "incoming job"
```

Render all five rows always. `not_run` is meaningful — it shows the gate stopped early.

**`state` has four values, not two, and `unverified` is the one people get wrong.**
It means *we could not obtain the evidence* — ANS unreachable, no transparency log configured.
It fails closed (`ok: false`) but it is not the agent's fault, and it must not be drawn the same
way as `fail`. Suggested: `fail` red, `unverified` amber with "evidence unavailable".
**Never draw `unverified` as a pass.**

The `status` check carries two independent pieces of evidence, and the difference is the whole
point of that row:

```js
evidence: {
  registry_status: "ACTIVE",
  inclusion: { state: "pass", detail: "entry #1 is in the signed log (size 8)", log_index: 1 },
  standing:  { state: "pass", detail: "ANS says ACTIVE, signed 0s ago",
               status: "ACTIVE", version: "1.0.0",
               issued_at: "...", expires_at: "...", age_seconds: 0 }
}
```

- **inclusion** — the registration is in the transparency log. History. Still verifies perfectly
  after the agent is revoked, which is why it can never be the whole answer.
- **standing** — a signed, short-lived statement that the agent is in good standing *now*. This
  is the one that catches a revocation. `source` says how we got it:
  `"presented by the agent"` (it attached `X-ANS-Status-Token` to its own response and we
  verified it offline, no registry call) or `"fetched from the registry"` (nothing was presented,
  so we asked). Worth surfacing — offline verification is the point of the design, not a detail.

If you show one number on the Trust Gate, show standing's `age_seconds`. "Verified 3 seconds ago"
is a far stronger claim than "verified".

### Guardian
| type | when | useful `data` |
|---|---|---|
| `agent.granted` | scoped authority issued | `grant_id`, `scopes[]`, `expires_at` |
| `action.requested` | an agent wants to do something | `action`, `resource`, `destination`, `purpose`, `payload_sha256` |
| `policy.evaluated` | the rules ran | `outcome`, `reason`, `required_scope`, `granted_scopes[]`, `rules[]` |
| `action.completed` | allowed, and done | `action`, `performed`, `detail` |
| `action.blocked` | refused | `incident_id`, `reason`, `rules[]` |
| `approval.requested` | waiting on a person | `incident_id`, `action`, `resource`, `payload_sha256`, `expires_at` |
| `approval.decided` | person answered | `decision` |

### Work and proof
| type | when |
|---|---|
| `job.sent` / `job.working` / `job.done` | hand-off, in progress, signed deliverable returned |
| `result.verified` / `result.rejected` | signature and standing checked |
| `agent.online` / `agent.revoked` / `agent.upgraded` | lifecycle |
| `chaos.impostor` | the impostor posted a fake offer |
| `llm.fallback` | Gemini was unavailable, offline templates used |
| `demo.reset` | **clear your event list** |

---

## Objects

### Mission — `/api/missions/current`

```js
{
  id, text, scenario: {impostor, revoke, upgrade, exfil, publish},
  status: "planning"|"working"|"paused"|"reviewing"|"delivered"|"failed"|"cancelled",
  business: {name, type, location, audience},
  jobs: [ { title, capability, brief, status, agent, org, scopes[] } ],
  hires: [ { job, capability, ans_name, org, checks[], owner_approved,
             log_index, fingerprint, output_sha256, signed_at, engine } ],
  recruitments: [ <recruitment> ],
  roster: [ {ans_name, org, version, capabilities[]} ],   // who is on this mission right now
  approval: { job, ans_name, org, version, approved_version, reason } | null,
  review: { approved, issues[], summary } | null,
  stats: { checks_passed, blocked, signed },
  engines[], error, has_result, started_at, finished_at
}
```

`jobs[].status` is `pending → hiring → working → done`, with `rehiring` when an agent is dropped
mid-job. `approval` being non-null is your cue to show the pause.

**Three different "we need someone" moments — they should not look the same on screen:**

| | meaning | typical run |
|---|---|---|
| `capability.missing` | we have never had anyone who can do this | 3× |
| `recruitment.replacement_requested` | we had someone and lost them | 1× (WebForge revoked) |
| `capability.covered` | we already have someone; no search at all | 2× (fix + final review) |

The last one is the quiet case and it matters: if every job triggered a search, the search would
stop meaning anything.

### Recruitment — inside the mission

The capability-deficit drawer renders from one of these. `requested_scopes` is populated
*before* admission, so you can show what the agent is asking for while the decision is still open.

```js
{
  id, mission_id, job_title, capability,
  status: "discovering"|"evaluating"|"awaiting_approval"|"admitted"|"rejected"|"failed",
  candidates: [ {ans_name, org, endpoint, version, capabilities[], source, pitch} ],
  selected: "ans://..." | null,
  replacing: {ans_name, org, reason} | null,   // set when this is a backfill, not a first hire
  rejected:  [ {ans_name, org, failed_check, reason} ],
  requested_scopes: [...], granted_scopes: [...],
  started_at, finished_at
}
```

### Agent — `/api/state`

```js
{ agents: [ { key, name, org, role: "commander"|"vendor"|"impostor", domain, endpoint,
              online, ans_name, version, capabilities[],
              status: "ACTIVE"|"REVOKED"|"SUPERSEDED", status_reason,
              agent_id, registered_at, fingerprint, cert_expires } ],
  ans_backend: "sim"|"godaddy", llm_mode: "gemini"|"offline", offers: [...], pace: 1.0 }
```

Keep these four separate in the UI — collapsing them into one green dot loses the whole point:

```
identity: verified        (passed the gate)
standing: ACTIVE          (ANS says so, right now)
authority: 3 scopes       (what it may actually do)
runtime:  working         (what it is doing)
```

### Integration status — `/api/integrations/status`

```js
{ overall: "CONNECTED",
  checked_at: "...",
  components: [ { name: "ANS", state: "CONNECTED",
                  detail: "ANS simulator (local) · 6 registered agent(s)",
                  checked_at: "...", /* plus per-component extras */ } ] }
```

Five states, and the distinction between the first two is the point:

| state | meaning |
|---|---|
| `NOT_CONFIGURED` | nothing set up. Often fine — the demo runs without Gemini |
| `CONFIGURED_UNTESTED` | credentials exist; **nothing has proved they work** |
| `CONNECTED` | we made a real call, or saw real traffic, and it worked |
| `DEGRADED` | working, but falling back or partially available |
| `ERROR` | configured and failing |

**Never draw `CONFIGURED_UNTESTED` as green.** An API key in a file proves someone pasted a
string; it says nothing about whether the service answers. Every state here is probed live or
observed from traffic — none is inferred from configuration, and the UI shouldn't infer either.

Components are `ANS`, `Agent runtime`, `Gemini`, `Event stream`. No secrets are ever returned.

### Guardian incident — `/api/guardian/incidents`

```js
{ id, at, state: "ALLOWED"|"DENIED"|"NEEDS REVIEW",
  org, from, action, resource, destination, url, purpose, payload_sha256,
  decision: { outcome: "allow"|"review"|"deny", reason, required_scope, granted_scopes[], rules[] },
  grant: { grant_id, ans_name, scopes[], issued_at, expires_at, status } | null,
  result: { performed, detail } | null,
  approval_id                                    // present only when state is NEEDS REVIEW
}
```

`state: "NEEDS REVIEW"` means an agent is blocked waiting on a human — show the approve/refuse
control. It expires after 180s and silence counts as no.

---

## House rules

1. **Never invent a number.** No trust percentages, no match scores. Every number on screen comes
   from a field above.
2. **Verified, authorized, running and finished are four different things.** "Identity verified,
   permission denied" is a legitimate state and should be renderable.
3. **The result HTML is untrusted** — it's model output. Render it in `<iframe sandbox="">`, never
   inject it into the page.
4. **Don't fake progress.** A node appears because `agent.admitted` arrived, not on a timer.
5. **Demo vs live is not cosmetic.** `ans_backend` tells you which is real. If ANS is unreachable,
   say "ANS unavailable" — never show a green check you didn't get.
6. **A deliverable's signature is bound to its job.** `hires[].output_sha256` belongs to one
   `job_id` on one mission; it is not a general "this agent's work is fine" badge.

Questions, or a shape that doesn't fit what you're building: ask before working around it.
