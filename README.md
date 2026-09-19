# CortexAi

**Hire AI agents you can actually trust.** Built for VTHacks 14, GoDaddy "Best Use of ANS" track.

CortexAi turns a plain-English goal into finished work by hiring specialist AI agents from different organizations. Before any agent touches the job, it proves who it is through GoDaddy's [Agent Name Service (ANS)](https://www.godaddy.com/ans). Every hire, rejection and deliverable is visible, signed and traceable.

### Start here

- **[The guide](docs/GUIDE.md)** — the single source of truth: what this is, what is real, what
  is left, and the house rules. Paste it into your AI assistant before asking it for help.
- **[Work packets](docs/work/README.md)** — the open work, who owns which files, and
  [ready-to-paste prompts](docs/work/CODEX_PROMPT.md) for a coding agent.
- **[Technical reference](docs/REFERENCE.md)** — every module and gap, each claim marked by how
  we know it.

### Reference

- [API and event contract](docs/contracts.md) — every route, event and object the frontend needs
- [Questions for GoDaddy](docs/godaddy-questions.md) — what the public ANS docs do not settle
- [Product spec](docs/product-spec.html) — what it does, for whom, and why
- [Field guide](docs/field-guide.html) — ANS concepts, architecture and the build plan

## Quick start

Requires Python 3.11+. No API keys needed to run the full demo.

```bash
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # macOS/Linux: cp .env.example .env
python scripts/run_all.py --fresh
```

The fallback dashboard opens at http://127.0.0.1:8000. Press **Launch mission**.

The Next.js app is the frontend that ships. With the backend running, in a second terminal:

```bash
npm install
set CORTEX_RUNTIME_MODE=live && npm run dev   # proxies to the hub on :8000
```

The policy rules have unit tests that need nothing running:

```bash
pytest
```

To check everything works end to end (with the system running, in a second terminal):

```bash
python scripts/smoke_test.py
```

## What you'll see

The mission "Launch an online presence for Hokie Bites, a food truck in Blacksburg" runs through three jobs: brand kit → landing page → compliance review. With all demo scenarios on:

1. **Impostor**: an unregistered agent copies BrandStudio's public identity and bids for the brand job. It passes the lookup checks but fails **identity**, because it can't sign a challenge with BrandStudio's private key. Blocked.
2. **Revocation**: WebForge is revoked in ANS while it's building the site. The Commander re-checks status before accepting the deliverable, discards it, and hires the backup, SiteSmith.
3. **Surprise upgrade**: LegalCheck ships v1.1.0 right before the review. The version is part of the ANS name, so the Commander notices, and because the policy only approves 1.0.x, the mission pauses until you click **Approve**.
4. **Scope**: the hired site builder — verified, in good standing, doing real work — tries to send the brand kit to its own analytics host. It holds no scope for that, so the **Guardian** refuses before anything leaves. Its font fetch, which *is* in its grant, goes through in the same breath. Turn on "asks to publish the page" and it stops and asks you instead.
5. **Review loop**: Compliance flags the missing allergen notice. The site goes back for a fix and a final review.
6. **Proof**: every deliverable is signed, and every hire links to a transparency-log entry you can verify from the dashboard.

Use **Reset demo** between runs. Use `--fresh` before the real presentation, so versions start at v1.0.0 and v1.1.0 again.

## How it works

```
dashboard (browser) ──WebSocket──▶ hub :8000 ◀── events from every agent
                                     │
                                     ▼
                              Commander :8001 ──hires──▶ Brand :8002 · WebForge :8003
                                     │                   SiteSmith :8004 · Compliance :8005
                                     │                   (Impostor :8006, not in ANS)
                                     ▼
                     ANS: local simulator :8100, or GoDaddy's API
```

Every agent runs the **Trust Gate** (`mc/trustgate.py`) before trusting another agent:

| Check | Question | How |
|---|---|---|
| resolve | Is it registered? | ANS lookup and agent card fetch |
| identity | Is it really that agent? | It signs a random challenge; we verify with the public key in its ANS identity certificate, which must chain to the ANS CA and name this exact ANS name. This challenge is ours, not ANS's — GoDaddy's documented mechanisms are mTLS and DPoP, which prove possession of the same key against the same certificate |
| status | Still in good standing? | two separate things: a Merkle inclusion proof that it was registered, and a signed, short-lived status token saying it is ACTIVE *now*. The inclusion proof still verifies after a revocation — only the token catches one. Agents attach their own token to every response, so we verify it offline against keys we already hold, and only ask the registry if nothing was presented |
| capability | Does it do this job? | Agent card and ANS record |
| policy | Does it meet our rules? | Domain allowlist, approved versions (`config/agents.yaml`), and that it is answering from the address ANS lists for it |

Trust goes both ways: vendors verify the Commander's signed job request before doing any work.
And a signed deliverable is bound to the job that asked for it — signature, job and mission are
signed together, so yesterday's perfectly valid work cannot be handed back as today's.

Passing the Trust Gate gets an agent through the door. It says nothing about what the agent may
touch once inside, so hiring and authorizing are separate steps. When the Commander hires, it asks
the **Guardian** (`mc/guardian.py`, `services/hub/guardian.py`) to record a grant — this agent, this
mission, these scopes, expiring — and every sensitive thing the agent then wants to do has to come
back and ask:

| | |
|---|---|
| Who is asking? | the request is signed with the agent's ANS identity and re-checked against ANS, so a revoked agent stops being able to act mid-mission |
| Hard denies | reading credentials, exporting a private key, revoking another agent, disabling the Guardian — refused before grants or scopes are even looked at, and no human can approve one |
| Scopes | `http.fetch:fonts.googleapis.com` is a different permission from `external.upload:anywhere.example.net`; anything not granted for that job is denied |
| Outward-facing | publishing or emailing stops and asks a person, bound to the exact payload shown — change a byte and the approval no longer applies, and it can't be used twice |
| Network | the Guardian makes outbound calls itself, against its own allowlist. Agents have no outbound path of their own, so a denied upload is denied in the sense that counts |

The Guardian lives in the hub rather than in the Commander or the agents, because it has to be able
to say no to all of them. Its answers are plain deterministic code — the LLM explains, it never decides.

## Project layout

```
config/agents.yaml       the agents, their orgs/domains/ports, and the hiring policy
mc/                      shared library
  trustgate.py           the five checks, plus signed-deliverable verification
  guardian.py            grants, scopes and the policy every action is judged against
  identity.py            keys, CSRs, registration with ANS (keys stay in keys/, gitignored)
  ans/                   ANS client: sim_client.py (local) and godaddy_client.py (real API)
  crypto.py, merkle.py   certificates, signatures, transparency-log proofs
  skills.py              agent brains: Gemini prompts and offline templates
  agent_base.py          the web service every agent runs (/card, /challenge, /job)
services/
  ans_sim/               local ANS: Registration Authority, CA, transparency log, DNS
  hub/                   event stream, demo controls, serves the dashboard
    guardian.py          the gateway agents must ask before they act
  agents/                commander.py, vendor.py, impostor.py
src/                     the Next.js frontend (ships)
dashboard/               plain HTML/CSS/JS fallback, no build step
scripts/                 run_all.py, smoke_test.py, check_ans.py, register_agents.py
tests/                   pytest suite (no server needed) plus frontend unit tests
docs/                    GUIDE.md, REFERENCE.md, contracts.md, work/ packets and fixtures
```

## Configuration (`.env`)

| Variable | What it does |
|---|---|
| `GEMINI_API_KEY` | Free key from [Google AI Studio](https://aistudio.google.com). Without one, agents use offline templates |
| `LLM_MODE` | `auto` (default), `gemini`, or `offline` (fast and free for rehearsals) |
| `ANS_BACKEND` | `sim` (default) or `godaddy` |
| `DEMO_PACE` | Seconds between steps so the audience can follow (default 1.0) |

Each teammate should use their own Gemini key during development. Keep one key just for the demo so its free quota is intact on Sunday.

## Switching to GoDaddy's real ANS

`mc/ans/godaddy_client.py` is written against GoDaddy's published ANS REST reference — paths,
field names and revocation reasons are documented, not guessed. What none of it has had is a
token, so nothing in it has ever run. That is what step 2 is for.

1. Get a PAT and confirm whether it is enabled for OTE, production, or both. Set `ANS_API_URL`
   (`https://api.ote-godaddy.com` for OTE) and `ANS_PAT`.
2. Run `python scripts/check_ans.py`. It resolves, searches and reads — registering and revoking
   nothing — and prints, endpoint by endpoint, which assumptions survived contact. Anything that
   fails is a question for the sponsor, with the exact call attached.
3. One domain is enough. `agentHost` is a fully-qualified name, so give each agent a subdomain of
   something you already own (`brand.yourteam.xyz`, `sitebuilder.yourteam.xyz`) rather than buying
   five domains. They can all point at the same deployment; what has to be distinct is the ANS
   identity, not the hardware.
4. Set `ANS_BACKEND=godaddy` and run `python scripts/register_agents.py`. It prints the DNS-01 TXT
   record to add per host, then completes ACME validation.

Open questions for the sponsor are written up in [docs/godaddy-questions.md](docs/godaddy-questions.md) —
six of them, in the order that unblocks the most code.

Two things do not work on the hosted backend yet, and both fail loudly rather than quietly:

- **The status-token fallback path** is the one endpoint still guessed. It should seldom matter:
  agents present their own token and we verify it offline. If neither works, the Trust Gate
  reports the status check as `unverified` — it refuses the hire and says *we could not get the
  evidence*, which is a different sentence from *the agent is fine*.
- **Receipts are SCITT COSE_Sign1**, not the JSON Merkle receipts the simulator serves.
  `mc/merkle.py` cannot read them; use GoDaddy's `ans-verify` tooling rather than reimplementing
  COSE in a weekend.

Note: real ANS can't un-revoke an agent, so on the real backend **Reset demo** can't restore a revoked vendor. Register a new version instead.

## Honest framing for judges

The five companies are fictional and all built by our team. Every registration, certificate, signature, revocation and log proof is real cryptography. With the simulator, the ANS side runs locally; with `ANS_BACKEND=godaddy`, it's GoDaddy's.

The site builder's attempt to ship the brand kit off-site is ours too — we wrote the agent that
misbehaves, because a demo where permission is only ever granted teaches nobody anything. What is
not staged is the refusal: the Guardian is given no special knowledge of that request, and the same
rules deny it that would deny any other agent. Note what the Guardian does not claim. It decides
whether an action is permitted; it does not make an agent's *output* correct. And ANS proves who an
agent is, not that it will behave — which is exactly why there is a Guardian at all.
