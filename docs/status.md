# Mission Control — project status

The single place to find out what this is, what works, and what is still open.
**Last updated: 18 September 2026, after analysing the merged frontend (`47c682c`).**

Quick numbers: 4,508 lines of application Python · 819 lines of tests · 90 unit tests passing ·
five demo scenarios green end to end · 8,100 lines of Next.js frontend that builds clean and is
**not yet connected to any of it** (§5).

---

## 1. What this is

**Hire AI agents you can actually trust.** A person types one goal in plain English. A Commander
agent works out what it involves, discovers specialist agents from other organisations, proves
who they are through GoDaddy's Agent Name Service, gives each one narrowly scoped permission for
that mission only, watches what they do, blocks what they are not allowed to do, verifies the
work they return, and produces something real at the end.

The claim the whole thing is built to support:

> **Verified identity is not unlimited authority.** Knowing exactly who an agent is tells you
> nothing about what it should be allowed to do, and both questions have to be answered
> separately, visibly, and before any work happens.

Built for VTHacks 14, GoDaddy "Best Use of ANS" track. The five companies are fictional and all
ours; every registration, certificate, signature, revocation and log proof is real cryptography.

## 2. What it has to do

**For the track:** use ANS for what it is actually for — identity, discovery, lifecycle — and
be honest about the line between what ANS proves and what we decide.

**For the demo:** a mission that completes in a couple of minutes, in front of people, without a
network, with five things going wrong on purpose and being handled visibly.

**Constraints we hold ourselves to:**
- Never show a green check we did not earn. Evidence-unavailable is its own state, not a pass.
- Demo mode and live mode are both honest; neither pretends to be the other.
- No secret ever crosses into the browser.
- Every UI state comes from application state, never from a timer.
- Fail closed, and say which kind of no it was.

## 3. How it fits together

```
dashboard (browser) ──WebSocket──▶ hub :8000 ◀── events from every agent
                                     │  │
                                     │  └── Guardian: grants, scopes, action decisions
                                     ▼
                              Commander :8001 ──hires──▶ Brand :8002 · WebForge :8003
                                     │                   SiteSmith :8004 · Compliance :8005
                                     │                   (Impostor :8006, not in ANS)
                                     ▼
                     ANS: local simulator :8100, or GoDaddy's hosted API
```

Three boundaries that matter:
- **The Trust Gate** decides who gets in. Runs in every agent, not just the Commander — vendors
  verify the Commander before working for it.
- **The Guardian** decides what they may do once in. Lives in the hub so it can refuse the
  Commander and the agents alike; neither can switch it off.
- **ANS** answers who someone is. It does not answer whether they should be trusted with this
  job — that is ours, and conflating the two is the mistake the product exists to avoid.

## 4. What is done

### Identity and trust — complete
- **Five-stage Trust Gate**: resolve · authenticate · status · capability · policy, each with its
  own evidence. ECDSA P-256, X.509 certificates chained to the ANS CA with the ANS name in the
  SAN URI, RFC-9162 Merkle inclusion proofs.
- **Registration**: key → CSR → DNS challenge → CA-issued certificate → ACTIVE.
- **Standing separated from inclusion.** A transparency-log receipt proves a registration
  happened and keeps proving it after a revocation; a short-lived signed status token proves good
  standing *now*. Only the second can catch a revoked agent.
- **Offline verification.** Agents attach `X-ANS-Status-Token` to their own responses; we verify
  against cached root keys with no registry round-trip, and presented tokens are pinned to their
  subject so nobody can present a healthy neighbour's.
- **Four check states**: `pass · fail · unverified · not_run`. "The evidence says no" and "we
  could not get the evidence" both refuse the hire and are never drawn the same way.
- **Signed deliverables bound to their job.** Job and mission ids are signed and checked, so work
  signed perfectly well an hour ago cannot be handed back as today's.
- **Challenge signing is domain-separated**, so the challenge endpoint cannot be used as an
  oracle to forge deliverable signatures.

### Authority — complete
- **Mission-scoped grants**: this agent, this mission, these scopes, until this time. Issued per
  job by the Commander over a signed request; never inherited, never widened after the fact.
- **Deterministic policy engine**: hard denies no human can approve, scope matching, human review
  for outward-facing actions bound to an exact payload digest and usable once.
- **Network actions go out through the Guardian**, against its own allowlist, with the URL's host
  pinned to the granted host. Agents have no outbound path of their own.

### Orchestration — complete
- **Plans are dependency graphs**, one to six tasks, validated server-side before anything runs.
  Invalid plans go back to the model once with specific complaints, then fall back.
- **Roster and recruitment**: `capability.missing` when we have never had anyone,
  `recruitment.replacement_requested` when we had someone and lost them, `capability.covered`
  when we already have someone. Recruitment records keep candidates *and* refusals.
- **Reuse re-checks what can change** — standing and version — and a version change forces a full
  re-verification rather than inheriting an old admission.

### The five scenarios — all passing
| | what happens |
|---|---|
| Impostor | copies a real public identity, fails `authenticate` and `policy`, blocked |
| Revocation | WebForge revoked mid-job; deliverable discarded, SiteSmith backfills |
| Version change | LegalCheck ships v1.1 unannounced; mission pauses for a human |
| Scope violation | site builder tries to send the brand kit off-site; Guardian refuses |
| Human review | publish request waits for a person, runs once, cannot be replayed |

### Supporting
- `GET /api/integrations/status` — probed live, never inferred from environment variables.
- **90 unit tests**, none needing a server: trust, standing, guardian, planning, execution, results.
- `scripts/smoke_test.py` — the whole demo asserted end to end.
- `scripts/check_ans.py` — read-only preflight against the live GoDaddy API.
- `docs/contracts.md` — every route, event and object the frontend needs.
- `docs/godaddy-questions.md` — the six things the public docs do not settle.

## 5. The frontend

Roheen pushed a complete **Next.js frontend**, merged into `main` (`a3807aa`). It is a
substantial, genuinely well-made piece of work — and it is **not connected to any of the above.**
That is deliberate on their side, documented in `AGENTS.md` and `PLAN.md` as a Phase A boundary,
and it is the single largest piece of remaining work on the project.

### What was built

| | |
|---|---|
| Stack | Next.js 16.3.5 (App Router), React 19, strict TypeScript, Tailwind 4, Framer Motion, Zod, Playwright + axe-core |
| Size | ~3,400 lines TS/TSX, ~4,700 lines CSS, 8,100 total |
| Routes | `/` · `/field` · `/missions` · `/missions/[id]` · `/settings` (5 of the 10 the brief lists) |
| Build | **Clean.** `npm run typecheck` passes, `npm run build` compiles in 7s, 7 routes generated |
| Tests | 5 Playwright specs covering reduced motion, canvas-failure fallback, accessibility, wide/compact desktop, mobile |
| Extras | Procedural Canvas atmosphere, shared frame clock, visual-pause and reduced-motion support, self-hosted fonts |

### What it does well, and should be preserved

- **It does not claim verification it has not earned.** Fixture agents carry
  `identityStatus: "demo_verified"` and `verificationEvidence: ["Built-in demo fixture. No ANS
  registration."]`. That is exactly the house rule, followed without being asked.
- **It keeps runtime, identity and authorization separate** — three of the four states an agent
  node must distinguish. Only the per-check breakdown is missing.
- Accessibility and reduced-motion are tested, not assumed.
- Strict typing with Zod contracts at the boundary.

### The gap

**There is not one network call in the entire frontend.** No `fetch`, no WebSocket, no URL.

```
src/lib/api/HttpControlApi.ts   throws NOT_CONFIGURED — "No network calls in Phase A"
src/components/provider.tsx     hardwired to MockControlApi
src/lib/env/config.ts           live mode is explicitly available: false
```

State lives in `MockControlApi` and `localStorage`, driven by fixtures.

### Why the contracts do not match

The frontend was built against **`MASTER_PROMPT.md`** — the original design brief — rather than
against [`contracts.md`](contracts.md), which describes what the backend actually emits. Both were
reasonable things to build from. They describe different systems.

| | Backend emits | Frontend expects |
|---|---|---|
| Event envelope | `{id, ts, type, message, actor, subject, mission_id, data}` | `{schemaVersion, id, sequence, occurredAt, source, missionId, correlationId, type, payload}` |
| Event types | 30+, incl. `trust.check`, `agent.admitted`, `action.blocked` | 4: `mission.created`, `mission.state_changed`, `task.progress`, `capability.missing` |
| Casing | `snake_case` | `camelCase` |
| Mission | `text`, `business`, `jobs[]`, `hires[]`, `recruitments[]`, `roster[]`, `plan` | `title`, `objective`, `constraints[]`, `taskIds[]`, `budget`, `currentStage` |
| Agent | `ans_name`, `org`, `version`, `status`, `fingerprint`, `capabilities[]` | `identityStatus` (one enum), `authorizationSummary`, `verificationEvidence[]` |
| Trust | 5 checks × 4 states, each with evidence | a single `identityStatus` enum |
| Cast | BrandStudio, WebForge, SiteSmith, LegalCheck, Commander | Scout, Sage, Forge, Guardian, Perihelion |

The frontend also has slots for things the backend does not produce (`budget`, `constraints`,
`artifactIds`, `attempt`), and no slot for things it does (the five-row gate, recruitment
candidates and refusals, Guardian decision rules, the plan graph, `age_seconds` on standing).

### What this actually means

`PLAN.md` Phase D reads: *"Team connects Gemini, hosted workers, real ANS verification, server
policy gateway, persistence."* The frontend was planned on the assumption that **the backend does
not exist yet.** It has been finished for some time.

Neither half knew about the other. That is a coordination failure, not a competence one — both
halves are good work. But it means the integration is entirely ahead of us, and it is the biggest
single risk to the demo.

### Two frontends now exist

| | `dashboard/` | `src/` |
|---|---|---|
| Stack | plain HTML/CSS/JS, no build | Next.js + React + TS |
| Backend | **fully wired** — WebSocket, all routes, Guardian panel | **none** |
| Looks | functional | considerably better |
| Drives the demo today | yes | no |

**This needs a decision, and it is the most consequential one left.** Options:

1. **Wire the Next.js app** — implement `HttpControlApi` against the real hub plus a mapping layer
   from our shapes to theirs. Half a day, the mapping layer is the bulk of it, and it buys the
   better-looking demo.
2. **Keep `dashboard/` for the demo**, finish the Next.js app after. Safe, and wastes the
   frontend work on the day.
3. **Port the Next.js visual language onto the wired dashboard.** Middle path, awkward.

Recommendation: **1, with 2 as the fallback**, and decide by Saturday midday. `dashboard/` is not
deleted until the Next.js app has run the full demo end to end at least twice.

## 6. What is not done

| | status |
|---|---|
| **Live GoDaddy ANS** | Client written against the published REST reference — auth, registration, resolution, capability search, revocation, certificates. **Never executed.** No token yet. |
| **SCITT COSE receipts** | Not implemented. Hosted receipts are COSE_Sign1; ours are JSON. Deliberate — use GoDaddy's `ans-verify` rather than writing a COSE parser in a weekend. |
| **mTLS / DPoP** | Our proof-of-possession is a nonce challenge against the same ANS certificate. Honest about being ours, not ANS's. |
| **Gemini** | Wired everywhere and never run — no key yet. See §7. |
| **Deployment** | Agents run on localhost. Live ANS needs them publicly reachable at their registered FQDNs. |
| **Frontend integration** | The Next.js app makes no network calls at all. Biggest remaining task — see §5. |
| **Voice / BRIEF ME** | Cut. Does not change what a judge sees. |

## 7. Gemini: decided, not yet done

All four call sites already use Gemini the moment a key exists — the Commander's planner and all
three agents. The work outstanding is *which*, because turning all four on has a specific risk.

| Who | Plan | Why |
|---|---|---|
| Commander (planning) | **Gemini** | Free text → structure is the genuinely model-shaped task, and now that plans are real graphs it matters. |
| BrandStudio | **Gemini** | Creative, subjective, cheap, adds visible variety per run. |
| Site builder | **Offline** | The page is the visible artifact. The template is fast, polished and identical every time. |
| LegalCheck | **Gemini + deterministic floor** | Reading a page for problems suits a model — but see below. |

**The risk:** the review-loop beat is engineered. `_render_site` deliberately omits the allergen
notice on the first draft and `_fallback_review` deterministically catches it. Turn Gemini on for
both and the beat becomes a coin flip. **Fix: always run the rule checks, union them with the
model's findings.** The rules guarantee the beat, the model adds what a rule cannot express.

Remaining work: per-capability `llm:` setting in `config/agents.yaml`, the deterministic floor in
`review_site`, site builder defaulting to offline. About 45 minutes.

Failure handling is already right: any Gemini error falls back to templates, emits
`llm.fallback`, and shows as `DEGRADED`. An outage mid-demo degrades visibly, not silently.

## 8. What we need

### Gemini API key — free, two minutes
1. **aistudio.google.com** → sign in → **Get API key** → **Create API key**
2. `GEMINI_API_KEY=...` in `.env`
3. Launch a mission; look for `brains: gemini` instead of `offline`

Get two. One for development, one untouched for the demo — the free quota is easy to burn on
rehearsals.

### GoDaddy PAT — from the sponsor
Take `docs/godaddy-questions.md`. Ask question 1 first, then:

```dotenv
ANS_API_URL=https://api.ote-godaddy.com
ANS_PAT=<their token>
```

then `python scripts/check_ans.py` — read-only, thirty seconds, tells you which documented
assumptions survive contact.

### Domain — we have one
**`getcortex.vip`, registered at Porkbun.** The registrar does not matter to ANS: domain control
is proved with a DNS-01 TXT record.

Wired in as a switch rather than a rewrite. `ANS_DOMAIN=getcortex.vip` moves all five agents to
subdomains of it; leave it unset and they keep their fictional domains, which is the better story
for a simulator demo. **Both modes are tested end to end.**

Still needed: DNS records pointing those subdomains at wherever the agents run, and the agents
actually running there. See §9.

### Decisions still open
1. **Which frontend ships** (§5). The most consequential one left. Decide by Saturday midday.
2. **The name.** No longer cheap. The backend says *Mission Control*, the brief says *APHELION*,
   and the frontend is *PERIHELION* throughout — package name, routes, components, docs, the
   coordinator agent. Two halves of one project currently have two different names. Pick one
   today; whoever renames the frontend should do it in a single commit.
3. Gemini split (§7) — confirm or change.
4. Live ANS: full deployment, or the hybrid in §9.
5. **Disk space.** The dev machine is at 100% (0 bytes free); clearing the npm cache recovered
   154 MB, which is not enough to work in. `.git` is 54 MB and `docs/` is 40 MB, mostly committed
   PNG screenshots. Worth pruning before Sunday — a full disk will break the demo, not just the
   build.

## 9. The live-ANS reality check

Going live is not just a key. Registering `https://brand.<domain>` means the agent has to *be*
there — resolution hands that URL to whoever is hiring, we fetch the card from it and challenge
it, and the endpoint-mismatch policy check refuses agents answering from anywhere else. So
registering public URLs while running on localhost fails by design.

- **Cloudflare Tunnel** — five subdomains to five local ports. Free, no server, about an hour.
- **A small VPS** with a reverse proxy. More control, more hours.
- **Hybrid — the recommendation.** Register *one* agent for real, prove resolution and
  verification against GoDaddy live on stage, run the mission on the simulator. Gets the ANS
  integration credit without betting the demo on deployment at 2am.

## 10. Running it

```bash
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python scripts/run_all.py --fresh      # dashboard at http://127.0.0.1:8000
```

```bash
pytest                                  # 90 tests, no server needed
python scripts/smoke_test.py            # the whole demo, asserted (system must be running)
```

Use **Reset demo** between runs, and `--fresh` before the real thing so versions start clean.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Live ANS does not work in time | Simulator is the default and is honest about being one. Hybrid in §9. |
| Gemini quota burned in rehearsal | Second key reserved for the demo. |
| Gemini breaks the review-loop beat | Deterministic floor (§7). Not done yet — do it with the Gemini work. |
| A judge types an unusual mission | Plans are real graphs now; out-of-scope work is named, not faked. |
| Frontend integration runs out of time | `dashboard/` is wired and drives the demo today. Do not delete it until the Next.js app has run the demo twice. |
| Two names in one project | Decide today. The cost grows with every commit either side makes. |
| Dev machine out of disk | Prune `.git` and `docs/` screenshots; keep the demo machine above a few GB free. |
| Something fails live | Every dependency degrades visibly rather than silently. That is the story, not a failure of it. |
