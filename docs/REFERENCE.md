# CortexAi — complete technical reference

Every subsystem, why it exists, why it was built the way it was, what is finished, what is
half-finished, and what has not been started. Written 19 September 2026 against commit `1a15f54`.

**How claims are marked in this document:**

| Mark | Meaning |
|---|---|
| **VERIFIED** | I ran it and saw the result |
| **TESTED** | Covered by an automated test that passes |
| **BUILT** | Code exists and compiles, end-to-end behaviour not confirmed |
| **NOT BUILT** | Does not exist |

That distinction matters. Earlier in this project I reported things as working on the strength of
code existing, and was correctly challenged on it. Assume nothing here is true unless it carries
a mark.

---

# PART I — THE PRODUCT

## 1. What it does

A person types one goal in plain English:

> *"Launch an online presence for Hokie Bites, a food truck in Blacksburg."*

A **Commander** agent decomposes that into tasks, discovers specialist agents belonging to other
organisations, proves who they are through **GoDaddy's Agent Name Service**, grants each one
narrow permission scoped to that mission alone, watches what they do, blocks what they may not
do, verifies the signed work they return, and assembles a finished website.

Built for VTHacks 14, GoDaddy **"Best Use of ANS"**. Submission Sunday 8 AM, judging 10:30 AM.

## 2. The thesis, and why the architecture follows from it

> **Verified identity is not unlimited authority.**

Every design decision traces to this. Knowing precisely who an agent is tells you nothing about
what it should be permitted to do. They are two questions and the system answers them in two
separate places:

- **ANS** answers *who is this?* — identity, discovery, lifecycle, revocation.
- **The Guardian** answers *may it do this, here, now?* — scopes, grants, policy.

This is not our invention. GoDaddy's own documentation says ANS "does not establish that the
caller is authorized to use the agent," and their workshop deck says *"Never let discovery alone
authorize an action."* We built the layer they deliberately did not.

**Why it matters for the build:** anything that blurs the two is treated as a bug even when it
would make the demo smoother. The Guardian lives in the hub rather than inside the Commander
specifically so that it can refuse the Commander. An agent that passes every identity check still
gets refused when it asks for something outside its grant — and that refusal is the strongest
moment in the demo.

---

# PART II — ANS IN FULL

## 3. What ANS is

DNS tells you where a website is. TLS proves which website you reached. ANS is the equivalent
identity layer for AI agents.

It does not build the agent, run its model, decide what it may access, or guarantee it behaves
well. It gives an agent a domain-backed name, publishes how to reach it, cryptographically binds
that identity to certificates, and records lifecycle events in an auditable log.

GoDaddy's framing: **"MCP connects. A2A coordinates. ANS verifies."**

| Technology | Role |
|---|---|
| MCP | Connects models to tools and resources |
| A2A | Lets agents message and coordinate |
| OAuth / OIDC | Authorizes access to protected resources |
| **ANS** | **Identifies, discovers and verifies the agent itself** |

## 4. The ANS name

```
ans://v1.0.0.myagent.example.com
 │      │        │
 │      │        └── domain-based identity anchor — who controls the name
 │      └─────────── semantic version — which deployment you meant
 └────────────────── the identity scheme
```

**The name is immutable.** A version change creates a *new registration*, not an edit.
`v1.0.0` and `v1.1.0` are different agents and can coexist. Callers may request an exact version
or a range (`^1.0.0`, `~1.2.3`, `*`).

**Why this matters to us:** our version-upgrade scenario depends on it. A vendor that ships
`v1.1.0` mid-mission is, as far as ANS is concerned, a *different agent*, so the Commander pauses
and asks a human rather than silently continuing. That is a real property of ANS, not a contrivance.

## 5. The four pieces

### 5.1 DNS discovery
Records published under the agent's hostname:

```
_ans.myagent.example.com        TXT    discovery (legacy ANS_TXT profile)
myagent.example.com             SVCB   discovery (newer ANS_DNSAID profile, v2 default)
_ans-badge.myagent.example.com  TXT    points at the transparency-log entry
_443._tcp.myagent.example.com   TLSA   binds the endpoint to a specific certificate
```

DNSSEC matters: without it a TLSA record cannot provide DANE assurance and clients fall back to
ordinary public-CA validation.

### 5.2 Dual certificates

ANS separates two identities that ordinary HTTPS conflates:

| Certificate | Asserts | Issuer |
|---|---|---|
| **Server certificate** | this TLS server controls `myagent.example.com` | public CA, or bring-your-own |
| **Identity certificate** | this key belongs to `ans://v1.0.0.myagent.example.com` | ANS private CA |

The identity certificate carries the ANS name as a **URI Subject Alternative Name**. That binding
is what makes the name unforgeable — a copied agent card asserts a name; only the certificate
*contains* one.

**VERIFIED** against a real stranger: `supplier.webmesh.ai`'s leaf certificate has
`SAN: ['supplier.webmesh.ai', 'ans://v1.0.3.supplier.webmesh.ai']`, issued by
`CN=GoDaddy Private ANS Issuing CA - PR1v1`, chaining to `GoDaddy Private Commercial Root CA - PR1`.

### 5.3 Transparency log

An append-only Merkle tree recording registrations, revocations and lifecycle events, with
inclusion proofs and signed checkpoints. GoDaddy's implementation uses SCITT-style COSE receipts.

The precise claim is **tamper-evident and publicly auditable**, not "immutable" — a bad operator
can make data unavailable, but cannot alter logged history without breaking signed proofs.

### 5.4 The trust card

`/.well-known/ans/trust-card.json` — the agent serves its own machine-readable identity document:

```json
{
  "ansName": "ans://v1.0.3.supplier.webmesh.ai",
  "agentHost": "supplier.webmesh.ai",
  "version": "1.0.3",
  "endpoints": [{ "protocol": "A2A", "agentUrl": "...", "metaDataUrl": "..." }],
  "keys": [{ "kty": "OKP", "crv": "Ed25519", "kid": "...", "x5c": ["<X.509 chain>"] }],
  "agentId": "...",
  "transparencyReceipt": { ... }
}
```

**This is the most important thing we learned.** It means a stranger's identity can be verified
**offline, with no registry credential**: fetch the trust card, verify the `x5c` chain to
GoDaddy's ANS CA, confirm the ANS name is in the leaf's SAN, then verify the agent card's JWS
signature against the published key.

## 6. Lifecycle states

```
PENDING_VALIDATION   waiting for domain control proof
PENDING_CERTS        certificates being issued
PENDING_DNS          certs ready, discovery records not yet published
ACTIVE               live and discoverable
DEPRECATED           recorded but no longer preferred
REVOKED              explicitly revoked
EXPIRED              registration or validation material lapsed
FAILED               registration could not complete
```

**TESTED** — we handle all eight. The three `PENDING_*` states report as `unverified` (our
registration is unfinished; the agent did nothing wrong); the rest report as `fail`. An
unrecognised future state fails closed. See `tests/test_lifecycle.py`.

## 7. The GoDaddy REST surface

```
GET  /v1/agents                              search
POST /v1/agents/register                     register
GET  /v1/agents/{agentId}                    detail
POST /v1/agents/resolution                   resolve host+version -> endpoint
POST /v1/agents/{agentId}/verify-acme        complete DNS-01
POST /v1/agents/{agentId}/verify-dns         verify production records
POST /v1/agents/{agentId}/revoke             revoke
GET  /v1/agents/{agentId}/certificates/identity
GET  /v1/agents/{agentId}/certificates/server
GET  /v1/ans/registered-agents               the indexed registry
GET  /v1/agents/events                       lifecycle event stream
```

### What we measured against production

| Call | Result |
|---|---|
| `GET /v1/ans/registered-agents` | **VERIFIED 200, no credential.** 216,110 agents. |
| `?query=<text>` | **VERIFIED.** Text search with relevance scoring. |
| `?capabilities=<exact>` | **VERIFIED.** Exact match on registered function names. |
| `POST /v1/agents/resolution` | **VERIFIED 302** to a login — needs auth |
| `GET /v1/agents/{id}` | **VERIFIED 302** — needs auth |
| `GET /v1/agents/{id}/certificates/identity` | **VERIFIED 302** — needs auth |
| `transparency.ans.godaddy.com/root-keys` | **VERIFIED 200.** Signed-note format, not JSON. |

### The record shape, corrected against the wire

Three documented assumptions were wrong, and each produced a record that looked fine and then
failed every check:

| We assumed | Reality |
|---|---|
| `status` | nested at `lifecycle.status` |
| `version` = `"1.0.3"` | `agentVersion` = `"v1.0.3"`, with the prefix |
| results under `agents`/`results` | under `items` |

Also present and now captured: `leafIndex` and `logId` (transparency-log pointers), `expiresAt`,
and `scores.trustScore` — GoDaddy's own scoring, which we keep under `provider_scores`, clearly
attributed, **never rendered as our judgement**. **TESTED** in `tests/test_godaddy_mapping.py`
against a verbatim captured response.

## 8. The discovery trap

Our capability vocabulary (`brand.identity`, `site.generate`, `compliance.review`) matches
**zero** of 216,110 agents. Registry capability names are free text chosen by registrants:
`Generate Logo`, `Generate Website`, `Translate Text`, `Apply Fonts`.

Text search alone is worse than useless. Roughly 200,000 of those agents are auto-generated
customer-support bots:

| `?query=` | Top hit | What it can actually do |
|---|---|---|
| "build a landing page website" | *Landing Page Customer Support Agent* | `Answer Questions, Order Lookup` |
| "legal compliance review" | *Accessibility Assurance Customer Support* | `Answer Questions, Order Lookup` |
| "translate text" | *Professional Translation Solution Customer Support* | `Answer Questions, Order Lookup` |

**The working strategy** (designed, **NOT BUILT** — this is P7):

```
1. CAST      ?query=<phrasings>     high recall over 216k
2. HARVEST   read the capability names the results actually declare
3. FILTER    ?capabilities=<exact>  high precision
4. GATE      the Trust Gate's capability check rejects the rest
```

Step 2 is the interesting part: you learn the vocabulary *from the results*, because there is no
controlled vocabulary to know in advance.

## 9. Who can actually be called

**VERIFIED** by probing each one:

| Agent | Reachable? |
|---|---|
| `agent.webmesh.ai` — verify / discover / interact | **yes, `noAuth`** — I made a successful A2A call |
| `supplier.webmesh.ai` — travel supplier reference | yes; `get_quote` noAuth, `book_flight` needs a mandate |
| `fraud.webmesh.ai` — 13-attack adversary | yes, `noAuth` |
| GoDaddy Website Builder (`Generate Website`, `Publish Website`) | **no** — DNS does not resolve publicly |
| GoDaddy Logo Generation (`Generate Logo`) | **no** — 401 |
| `shopagent.cloud` — 42 shopping skills | **no** — requires `ansMtls` / `ansJwt` / `apiKey` |

## 10. External references

### ANS
| | |
|---|---|
| Specs | `github.com/agentnameservice/ans-registry` |
| Reference implementation | `github.com/agentnameservice/ans` (`ans-ra`, `ans-tl`, `ans-verify`, `ans-dns`; MIT) |
| Go SDK + CLI | `github.com/agentnameservice/ans-sdk-go` |
| Java SDK | `github.com/agentnameservice/ans-sdk-java` |
| Trust Index | `github.com/agentnameservice/agent-trust-discovery` |
| GoDaddy docs | `developer.godaddy.com/doc/endpoint/ans` |
| CLI install | `brew install agentnameservice/ans/ans-cli` |

`ans-verify` is the offline COSE receipt verifier — **the answer to our SCITT gap.** Do not write
a COSE parser this weekend.

### Webmesh — the sponsor's live reference deployment
| Host | Role |
|---|---|
| `webmesh.ai` | index |
| `agent.webmesh.ai` | `verify` / `discover` / `interact` over A2A |
| `supplier.webmesh.ai` | the defended reference agent |
| `authority.webmesh.ai` | signs spending mandates |
| `auditor.webmesh.ai` | auditing |
| `rogue-supplier.webmesh.ai` | **valid ANS identity, skips required checks** |
| `fraud.webmesh.ai` | 13-attack adversary battery |

Saved as fixtures: `docs/work/fixtures/webmesh/`.

**`rogue-supplier` is worth noting** — it is the sponsor's own demonstration that a valid identity
can still behave improperly. That is exactly our Guardian's thesis, from their side.

### The 13 attacks (`fraud.webmesh.ai`)

`run_battery` plus: `replay_booking`, `underpay_booking`, `tamper_mandate`, `underpay_valid_sig`,
`quote_swap_attack`, `wrong_audience_attack`, `wrong_scope_attack`, `wrong_dpop_key_attack`,
`corrupt_jws_attack`, `superseded_format_attack`, `unknown_key_mandate`, `replay_settled`,
`canonicalization_probe`, plus `payto_binding_check` and `card_drift_watch`.

This is effectively a published rubric for a well-defended agent. We have conceptual analogues for
most (single-use approvals, mission-bound grants, signed deliverables, scope matching). We do
**not** have DPoP, canonicalization defence, or card-drift detection.

---

# PART III — THE BACKEND

## 11. Architecture

```
browser ──▶ Next.js route handlers ──▶ hub :8000 ◀── events from every agent
                                         │  │
                                         │  └── Guardian: grants, scopes, action decisions
                                         ▼
                                  Commander :8001 ──hires──▶ vendors :8002-8005
                                         │                   (impostor :8006, not in ANS)
                                         ▼
                         ANS: local simulator :8100, or GoDaddy's hosted API
```

**Three boundaries, and why each sits where it does:**

- **Trust Gate** — who gets in. Runs inside *every* agent, not just the Commander. Vendors verify
  the Commander's signed job request before doing any work. **Trust runs both ways**, which is the
  point of ANS v2: the client can become the server and either side can demand proof.
- **Guardian** — what they may do once in. Lives in the hub, not the Commander, *specifically so
  it can refuse the Commander*. Neither side can switch it off.
- **ANS** — identity only, never policy.

## 12. Module inventory

```
mc/trustgate.py        385   the five checks, signed-deliverable verification
mc/skills.py           306   what each agent produces — prompts and offline templates
mc/guardian.py         213   grants, scopes, the policy engine
mc/crypto.py           188   keys, CSRs, certificates, signatures
mc/planning.py         140   plan validation
mc/config.py           108   config loading, ANS name parsing
mc/standing.py         103   status tokens
mc/identity.py          94   key generation, CSR, registration
mc/merkle.py            86   Merkle trees, inclusion proofs, receipts
mc/llm.py               77   provider layer, per-capability routing
mc/agent_base.py       231   the shared agent server every vendor runs
mc/events.py            22   event emission to the hub
mc/http.py              18   shared async HTTP client

mc/ans/godaddy_client.py  342   hosted ANS adapter
mc/ans/sim_client.py       81   simulator adapter
mc/ans/base.py             73   the interface both implement

services/agents/commander.py  682   planning, hiring, the execution graph
services/agents/impostor.py    67   the adversary
services/agents/vendor.py      15   vendor entry point
services/hub/app.py           244   REST + WebSocket + static
services/hub/guardian.py      284   the policy gateway agents must ask
services/hub/integrations.py  126   honest health reporting
services/ans_sim/app.py       328   the local ANS: RA, CA, Merkle log, DNS
```

## 13. The Trust Gate — `mc/trustgate.py`

Five checks, run before trusting any agent. **TESTED** across several suites; exercised live in
every smoke-test run.

| # | Check | Question | Mechanism |
|---|---|---|---|
| 1 | `resolve` | Is it registered? | ANS lookup, fetch the agent card |
| 2 | `authenticate` | Does it hold the private key? | It signs a random nonce; we verify against the public key in its ANS identity certificate, which must chain to the ANS CA and name this exact ANS name |
| 3 | `status` | In good standing *now*? | Merkle inclusion proof **and** a fresh signed status token |
| 4 | `capability` | Does it do this job? | Registered function names contain the capability |
| 5 | `policy` | Do *we* allow it? | Domain allowlist, approved versions, answering from the address ANS lists |

### Four states, not two

```
pass        the evidence says yes
fail        the evidence says no
unverified  we could not obtain the evidence
not_run     an earlier check failed, so we stopped
```

**Why this exists:** `unverified` means ANS was unreachable or a proof was unavailable. It refuses
the hire — we fail closed — but it is **not the agent's fault**. Rendering it like `fail` blames
the wrong party; rendering it like `pass` destroys the product. This distinction is the single
most important invariant in the codebase.

### Why checks 2 and 3 must stay separate

A **transparency-log receipt** proves a registration happened. It stays valid forever — including
ten minutes after the agent is revoked. A **status token** is short-lived, signed, and says the
agent is in good standing *now*. Only the second can catch a revocation.

Conflating them was a real bug we fixed. An outside review recently suggested merging them into
one "verify identity" step; that would reintroduce the bug and discard our strongest technical
point. **Do not do it.**

Agents attach their own status token (`X-ANS-Status-Token`) to every response, so we verify it
**offline** against root keys we already hold — no registry round-trip. Presented tokens are
pinned to their subject, because a valid ACTIVE token might be about somebody else.

### Signed deliverable verification

Work returned by a vendor is signed and bound to its job and mission, so a valid deliverable
cannot be replayed against a different task. **TESTED** in `tests/test_results.py`.

## 14. The Guardian — `mc/guardian.py` + `services/hub/guardian.py`

Passing the Trust Gate gets an agent through the door. It says nothing about what it may touch.

When the Commander hires, it asks the Guardian to record a **grant** — *this agent, this mission,
these scopes, expiring* — over a signed request. Then every sensitive action comes back and asks.

```
1. Hard denies      secrets.read, key.export, ans.revoke, guardian.disable
                    Refused before grants or scopes are even consulted.
                    NO HUMAN CAN APPROVE THESE.
2. Grant            no grant, wrong mission, wrong agent, expired -> denied
3. Scope            http.fetch:fonts.googleapis.com is a different permission
                    from external.upload:anywhere.example.net
4. Human review     outward-facing actions stop and ask a person, bound to an
                    exact payload digest, usable exactly once, expiring in 180s
```

**Why network calls route *through* the Guardian:** a denied upload must be denied in the only
sense that counts — nothing left the building. If the agent made the call itself and merely asked
permission afterwards, the refusal would be theatre.

**Why every decision is deterministic code:** the model explains, it never decides. A policy
engine a language model can talk out of a refusal is not a policy engine.

**TESTED** — `tests/test_guardian.py`, 182 lines.

## 15. Planning — `mc/planning.py` + `services/agents/commander.py`

Missions are **validated dependency graphs**, not fixed pipelines.

The planner asks a model for a plan, then validates it server-side *before anything runs*: no
cycles, no dangling dependencies, no capability we cannot source, one to six tasks. If validation
fails, the specific complaints go back to the model **once**. If that fails, a deterministic
three-task plan runs.

**Why one retry and not more:** an unbounded retry loop with a confused model burns the demo clock
and usually makes the plan worse, not better.

A plan that survives validation may still be a *bad* plan — that is a judgement no amount of
checking makes for us. What it cannot be is unrunnable. Work we have no capability for lands in
`plan.unsupported` and is stated out loud, never faked.

**TESTED** — `tests/test_planning.py`, 226 lines. **Never run against a real model** (§19).

## 16. Recruitment and replacement

When the Commander needs a capability nobody on the roster has, it emits `capability.missing`,
searches ANS, collects candidates, runs each through the Trust Gate, and records the whole
episode as a `recruitment` object — candidates, refusals with reasons, requested scopes (captured
*before* the decision), granted scopes, and whether this was a replacement.

**Why record refusals:** who we turned away is as much the story as who we hired, and it is the
only way a judge can see the gate doing work.

**TESTED** — `tests/test_recruitment.py`.

## 17. The LLM layer — `mc/llm.py`

Per-capability routing, because the right brain differs by job:

```yaml
llm:
  mission.plan:      gemini    # free text into a dependency graph is the model-shaped task
  brand.identity:    gemini    # creative, cheap, visible variety per run
  site.generate:     offline   # the page is the artifact a judge looks at; the template
                               # renders identically every time and never surprises us
  compliance.review: gemini    # good at reading a page — with the rule floor beneath it
```

`LLM_MODE=offline` forces determinism for rehearsals; `LLM_MODE=gemini` forces the model. No key
means offline regardless.

### The review floor — `merge_reviews` in `mc/skills.py`

The demo's review loop depends on a **real** finding: the first draft genuinely has no allergen
notice and the rule checks genuinely catch it. Handing that to a model alone turned a reliable
beat into a coin flip — it might approve the page, or word the problem away.

So the rule checks run on **every** review and their findings are not negotiable. The model adds
what a rule cannot express; it can never remove a rule finding. Issues carry
`source: "rule" | "model"`, duplicates collapse, and a high-severity finding from either side
blocks approval.

**TESTED** — ten tests in `tests/test_review.py`, including an approving model over a genuinely
non-compliant page still yielding `approved: false`. **If a test there fails, the change is wrong,
not the test.**

### Graceful degradation

**VERIFIED** with a configured-but-failing key: a full mission produced four `llm.fallback`
events, reported Gemini as `DEGRADED` with the real reason, fell back to templates, and delivered
with all five scenarios green. Nothing pretended to work.

## 18. The ANS clients

### `mc/ans/base.py` — the interface
Both backends implement the same surface, so `ANS_BACKEND=sim|godaddy` swaps them wholesale.

### `mc/ans/sim_client.py` — the simulator adapter
Talks to our local ANS on `:8100`.

### `mc/ans/godaddy_client.py` — the hosted adapter
Written from GoDaddy's published REST reference. **Discovery is VERIFIED against production.**
Registration, resolution and certificates are **BUILT but never executed** — they need a credential.

Notable behaviours:
- No credential is not an error — discovery works unauthenticated, so a tokenless client is useful
- A 3xx is reported as *"needs authentication"*, not *"no result"* — the earlier message sent
  someone hunting for a missing agent instead of a missing credential
- Record mapping **TESTED** against a verbatim live response

### The simulator — `services/ans_sim/app.py`
**It is not a mock.** It is a working Registration Authority, CA, Merkle transparency log and DNS
stand-in, doing real cryptography. A forged certificate carrying the same ANS name and subject is
genuinely rejected.

```
POST /v1/agents                    register
GET  /v1/agents                    search
POST /v1/agents/{id}/verify        complete domain validation
POST /v1/agents/{id}/revoke        revoke
GET  /v1/agents/{id}/status-token  fresh signed standing
GET  /v1/resolve                   name -> record
GET  /v1/ca                        the CA certificate
GET  /v1/log, /v1/log/checkpoint, /v1/log/{i}/receipt, /v1/log/public-key
GET/POST /v1/dev/dns               the DNS zone (dev only)
POST /v1/dev/agents/{id}/status    force a lifecycle state (chaos)
```

**Known gap:** it publishes `_ans.{host}` and `_ra-badge.{host}` DNS records that **nothing ever
reads**. DNS-native discovery is designed but not wired.

## 19. The hub — `services/hub/app.py`

The only process allowed to hold credentials, and the only one whose shape we promise not to
change without updating the contract.

```
GET  /api/state                          every agent: ANS name, org, version, status, fingerprint
POST /api/missions                       start a mission
GET  /api/missions/current               the live mission
GET  /api/missions/{id}
GET  /api/missions/{id}/result           the artifact
POST /api/missions/{id}/decision         approve/reject a version upgrade
GET  /api/integrations/status            honest component health
GET  /api/log, /api/receipt/{index}      transparency log
GET  /api/dns                            the simulator's zone
GET  /api/offers,  POST /api/offers      open-web offers
POST /api/chaos/revoke/{key}             chaos controls
POST /api/chaos/upgrade/{key}
POST /api/chaos/impostor
POST /api/reset
POST /events                             agents post events here
WS   /ws                                 history frame, then live events
GET  /health
```

Guardian sub-router: `POST /grants`, `GET /grants`, `POST /grants/{id}/revoke`, `POST /actions`,
`GET /incidents`, `POST /incidents/{id}/decision`, `POST /reset`.

### `services/hub/integrations.py`
Reports each component as `CONNECTED` / `DEGRADED` / `NOT_CONFIGURED` with a human-readable
reason. **Why it exists:** "configured" is not "connected," and a dashboard that shows green for
a component that has never successfully done anything is the exact dishonesty the house rules
forbid.

## 20. Events — 32 types

```
mission.started  mission.planned  mission.revision  mission.delivered  mission.failed
capability.missing  capability.covered
discovery.started  discovery.candidate_found  discovery.completed
trust.check  agent.admitted  agent.rejected  agent.granted  agent.revoked
agent.upgraded  agent.unavailable
recruitment.replacement_requested
job.sent  job.working  job.done
action.requested  action.completed  action.blocked
approval.required  approval.requested  approval.decided
policy.evaluated  result.verified  result.rejected
llm.fallback  chaos.impostor  demo.reset
```

**The rule:** nothing appears in the UI on a timer. A node appears because `agent.admitted`
arrived; an edge animates because work is actually running. A judge who asks "is that real?" and
gets "no" has stopped listening.

One example of each is captured in `docs/work/fixtures/events-by-type.json`.

---

# PART IV — THE FRONTEND

## 21. Two frontends, and which ships

| | `dashboard/` | `src/` |
|---|---|---|
| Stack | plain HTML/CSS/JS, no build | Next.js 16, React 19, TypeScript, Tailwind 4 |
| Backend | wired — WebSocket, all routes | **wired** — SSE + proxied REST |
| Ships | no — fallback and reference | **yes** |

**Decision: the Next.js app ships.** `dashboard/` stays because it is the only thing that
currently exercises every contract end to end, which makes it useful to diff against. Do not
delete it until the Next.js app has run all five scenarios twice.

## 22. How the frontend reaches the backend

```
browser ──▶ /api/control/events   (SSE)  ──▶ Next route ──▶ hub /ws
browser ──▶ /api/control/<path>   (REST) ──▶ Next route ──▶ hub /api/<path>
```

**Why proxied rather than direct:** it keeps credentials server-side (house rule 3) and avoids
CORS entirely. The browser never learns the hub's address.

The proxy is **not** a pass-through — **VERIFIED**:

- Reads allowlisted by regex; `reset`, `chaos/*` and `log` all return **404**
- Writes additionally require same origin — **403** without it
- Bodies capped at 6000 bytes and Zod-validated
- `objective`/`idempotencyKey` rewritten to the hub's `text`/`idempotency_key`

**VERIFIED end to end**: a mission POSTed at the browser layer ran to `delivered` with 5 jobs and
5 hires; the SSE stream delivered `connected` then a real `history` frame.

## 23. Frontend file inventory

```
src/lib/api/ControlApi.ts        14   the interface every view consumes
src/lib/api/MockControlApi.ts   144   fixtures + localStorage (demo mode)
src/lib/api/HttpControlApi.ts   126   live: SSE, reconnect, idempotent mission creation
src/lib/api/hub-mapping.ts       58   backend shapes -> frontend shapes
src/lib/api/hub-proxy.ts         47   allowlist, validation, rewriting
src/lib/api/same-origin.ts       11   origin check for writes
src/lib/env/config.ts            17   runtime mode
src/contracts/index.ts                Zod schemas

src/components/network.tsx      254   the agent graph
src/components/agents/agents-console.tsx  195
src/components/shell.tsx        181
src/components/agent-signature.tsx        166
src/components/field.tsx        164
src/components/living-field.tsx 156
src/components/composer.tsx     144
src/components/page-transition.tsx        111
src/components/ui.tsx           106
src/components/provider.tsx      50   chooses Mock or Http by mode
src/components/voice/**               ElevenLabs (added by a teammate)

routes: / · /field · /agents · /missions · /missions/[id] · /settings
```

**Why the `ControlApi` interface exists:** it let the frontend be built and reviewed against
fixtures for a week while the backend was developed separately, then swapped to live data without
touching a single view component. That decoupling is why P1 took hours rather than days.

## 24. Why the shapes did not line up

The frontend was built from the original design brief; the backend grew into `docs/contracts.md`.
Different envelope, `camelCase` vs `snake_case`, 4 event types defined against 32 real ones, and a
single `identityStatus` enum where the backend emits five checks with four states each.

`hub-mapping.ts` is the translation. **The rule that matters there:** `unverified` must never
collapse into `pass`. If the target enum has no room for it, widen the enum.

---

# PART V — STATUS

## 25. DONE

**Backend** — 137 unit tests, all five demo scenarios green end to end:
- Five-stage Trust Gate with per-check evidence and four states
- Standing separated from inclusion; status tokens verified offline from tokens agents present
- Deliverables signed and bound to their job and mission
- Mission-scoped expiring grants; deterministic policy engine; hard denies; single-use human review
- Network actions performed by the Guardian, not the agent
- Plans as validated dependency graphs with a bounded retry
- Roster-based recruitment with replacement handling
- Eight ANS lifecycle states distinguished
- Honest degradation: `llm.fallback`, `DEGRADED`, no pretending

**Frontend** — builds clean, wired and **VERIFIED** end to end.

**Live ANS** — discovery **VERIFIED** against production; record mapping **TESTED** against a
verbatim live response; RSA certificate chains now verify (see §28).

**Name** — CortexAi, renamed across both halves.

## 26. IN PROGRESS / JUST LANDED

- **P1 frontend adapter** — landed 19 Sep, **VERIFIED**
- **Voice (ElevenLabs)** — a teammate added `src/lib/voice/**`, `/api/voice/session`, tests.
  Not assessed by me.

## 27. NOT DONE — and the plan

| | What | Why it matters | Effort |
|---|---|---|---|
| **P2** | Trust Gate / Guardian / Recruitment **views** | The screens that make the product legible. The Trust Gate panel is the thing people photograph. Data now flows; the views do not exist. | ~half a day |
| **P7** | Two-stage live discovery (`mc/discovery.py`) | Prize track. Needs no credential. **Nothing in the running system touches the live registry today.** | ~3 hours |
| **P8** | A working Gemini key | **No agent is currently using a language model.** Everything runs on templates. | errand + 2h |
| **P9** | Runtime stranger verification | We verify *saved copies* of strangers' certs in tests. The Commander does not fetch a trust card at runtime. | ~2 hours |
| **P10** | A2A client | Proven by hand; **not in the codebase**. Needed to actually call `agent.webmesh.ai`. | ~2 hours |
| **P3** | pause/resume, `/api/bootstrap`, contract merge | Frontend proposed them; pause/resume does not exist | ~3 hours |
| **P4** | Live ANS registration + deployment | Needs an API key and public reachability | half a day |
| **P5** | Agent output quality | The page is what judges look at | ~2 hours |
| **P6** | Demo script, rehearsal, failure drills | Nobody owns the run-of-show | ~3 hours |
| — | **Threat model document** | **The sponsor asked for it by name** and it does not exist | 30 min |

### Deliberately not doing

- **COSE/SCITT parsing.** GoDaddy's receipts are COSE_Sign1; `mc/merkle.py` reads JSON. Use
  `ans-verify` instead. Until then the status check reports inclusion as `unverified` — which
  refuses the hire and says why.
- **mTLS / DPoP.** Our nonce challenge answers the same question against the same certificate,
  and it is labelled honestly as ours throughout.
- **Event sequence numbers and cursors.** Single hub, no duplicates, history replays on connect.
- **DNS-native discovery, TLSA/DANE, card-drift detection, consistency proofs.** All real ANS
  features we do not use. Worth an hour each if hands appear; none is on the critical path.

## 28. Known bugs, traps, and things that have already cost time

**Fixed:**
- **RSA vs ECDSA.** `cert_issued_by` hardcoded ECDSA because the simulator issues ECDSA.
  GoDaddy's ANS certificates are RSA, so *every genuine GoDaddy agent* was reported as a signature
  failure — visually indistinguishable from a forgery. Would have surfaced on stage. Now dispatches
  on key type and refuses types it cannot check. **TESTED** against real captured trust cards.
- **Lifecycle states.** Four understood, eight real. All non-ACTIVE refused correctly, but they
  read identically — `PENDING_DNS` looked like a compromise.

**Live traps:**
- **Ports.** Only one instance can hold them. `run_all.py` fails to bind if another is alive and
  you then test stale services with accumulated state. **Three sessions lost to this.**
  `next dev` also survives its parent shell — kill by port, not by shell.
- **`unverified` collapsing into `pass`.** Guard in every mapping and every view.
- **The review floor.** A model must never remove a rule finding.
- **Stale `node_modules`.** The lockfile moved; run `npm install` or you get TypeScript errors
  that look like broken code.
- **Disk.** The machine has filled twice. `.git` is 54 MB, `docs/` 44 MB, mostly screenshots.

## 29. The two blocking errands

Neither is a coding task.

**A Gemini key** — aistudio.google.com/apikey, **create it in a NEW project** (existing projects
produce zero-quota keys), paste as text not a photo. Two keys have failed: one with
`quota_limit_value: '0'`, one that was not an API key at all (`AQ.` prefix, 53 chars; real ones
are `AIza` + 35).

**A GoDaddy API key** — the GoDaddy table Saturday 1:00–3:30, or `#godaddy` on Discord. Ask:
*"Can we have the hackathon ANS API key, and should we use production or OTE?"* Also ask:
*"Is there a reachable sandbox agent we're authorized to invoke?"* and *"If production
registration stays blocked, is a simulator-backed entry still eligible for the category?"*

---

# PART VI — DEMO AND JUDGING

## 30. What the demo shows

```
1.  one sentence typed in
2.  the Commander plans it and finds it has nobody for the first job
3.  it searches ANS, finds candidates, runs the Trust Gate
4.  an impostor bids and is refused — it cannot prove it holds the key
5.  real agents are admitted, each with narrow scoped permission
6.  one is revoked mid-job; its work is discarded and a replacement recruited
7.  one ships a new version unannounced; the mission pauses for a human
8.  one tries to send data off-site; the Guardian refuses before anything leaves
9.  compliance sends the work back; it is fixed and re-reviewed
10. a finished, signed, provenanced website
```

**Step 8 is the strongest beat and is usually undersold.** That agent is *fully verified* — valid
ANS identity, all five checks passed — and still blocked. Identity is not authority.

## 31. House rules — not negotiable

1. Never show a green check you did not earn. `unverified` is not `pass`; "configured" is not
   "connected."
2. Fail closed, and say which kind of no it was.
3. No secret reaches the browser or an event payload.
4. No fake progress. UI state comes from events, never a timer.
5. Deterministic code decides; a model may explain but never decide.
6. No invented numbers. GoDaddy's `trustScore` stays under `provider_scores`, attributed to them.
7. Never weaken a check or an assertion to make something pass.
8. Result HTML is untrusted model output — render in `<iframe sandbox="">`.

## 32. Judge questions

**"Is this real ANS or a simulation?"** — By default the registry is ours, running locally, with
real cryptography. Against production GoDaddy we can discover 216,000 agents. Never fudge this.

**"Couldn't an agent skip the Guardian?"** — Network actions go out *through* it, so for those
there is no other path. In-process actions rely on cooperation; here is how you would enforce it
in production.

**"You wrote the agent that misbehaves."** — Deliberately. The refusal is not staged: the Guardian
has no special knowledge of that request and the same rules would deny any agent.

**"You registered all five agents yourself."** — The impostor holds BrandStudio's *exact public
identity* and still fails, because it cannot produce a signature. That is a real cryptographic
discriminator, not self-verification.

> **Do not currently claim "we verify strangers live."** We verify *saved* strangers' certificates
> in tests. That becomes true when P9 lands, and not before.

**"What does it prove?"** — That an agent is who it says it is, is in good standing now, and acted
inside permissions we granted. **Not** that its output is correct. Keeping those three separate is
what makes it rigorous instead of overclaiming.

## 33. The sponsor's stated criteria

From the workshop deck: *"Show the success path and the refusal path. Show the evidence, not just
the demo. Name your threat model and the tradeoff you chose."*

First two: done well. **Third: not written.** That is a 30-minute gap against an explicit ask.

---

## 34. Where else to look

| Document | For |
|---|---|
| [`GUIDE.md`](GUIDE.md) | the shorter orientation — read first if this is too long |
| [`contracts.md`](contracts.md) | every route, event and object shape |
| [`work/README.md`](work/README.md) | the work packets and file ownership |
| [`work/CODEX_PROMPT.md`](work/CODEX_PROMPT.md) | ready-to-paste prompts for an AI session |
| [`work/fixtures/`](work/fixtures/) | real captured backend output; Webmesh trust cards |
| [`godaddy-questions.md`](godaddy-questions.md) | what to ask at the sponsor table |
