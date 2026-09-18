# Mission Control

**Hire AI agents you can actually trust.** Built for VTHacks 14, GoDaddy "Best Use of ANS" track.

Mission Control turns a plain-English goal into finished work by hiring specialist AI agents from different organizations. Before any agent touches the job, it proves who it is through GoDaddy's [Agent Name Service (ANS)](https://www.godaddy.com/ans). Every hire, rejection and deliverable is visible, signed and traceable.

- [Product spec](docs/product-spec.html): what it does, for whom, and why
- [Field guide](docs/field-guide.html): ANS concepts, architecture and the build plan

## Quick start

Requires Python 3.11+. No API keys needed to run the full demo.

```bash
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # macOS/Linux: cp .env.example .env
python scripts/run_all.py --fresh
```

The dashboard opens at http://127.0.0.1:8000. Press **Launch mission**.

To check everything works end to end (with the system running, in a second terminal):

```bash
python scripts/smoke_test.py
```

## What you'll see

The mission "Launch an online presence for Hokie Bites, a food truck in Blacksburg" runs through three jobs: brand kit → landing page → compliance review. With all demo scenarios on:

1. **Impostor**: an unregistered agent copies BrandStudio's public identity and bids for the brand job. It passes the lookup checks but fails **identity**, because it can't sign a challenge with BrandStudio's private key. Blocked.
2. **Revocation**: WebForge is revoked in ANS while it's building the site. The Commander re-checks status before accepting the deliverable, discards it, and hires the backup, SiteSmith.
3. **Surprise upgrade**: LegalCheck ships v1.1.0 right before the review. The version is part of the ANS name, so the Commander notices, and because the policy only approves 1.0.x, the mission pauses until you click **Approve**.
4. **Review loop**: Compliance flags the missing allergen notice. The site goes back for a fix and a final review.
5. **Proof**: every deliverable is signed, and every hire links to a transparency-log entry you can verify from the dashboard.

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
| identity | Is it really that agent? | It signs a random challenge; we verify with the public key in its ANS identity certificate, which must chain to the ANS CA and name this exact ANS name |
| status | Still in good standing? | ACTIVE in ANS, plus a Merkle inclusion proof from the transparency log |
| capability | Does it do this job? | Agent card and ANS record |
| policy | Does it meet our rules? | Domain allowlist and approved versions (`config/agents.yaml`) |

Trust goes both ways: vendors verify the Commander's signed job request before doing any work.

## Project layout

```
config/agents.yaml       the agents, their orgs/domains/ports, and the hiring policy
mc/                      shared library
  trustgate.py           the five checks, plus signed-deliverable verification
  identity.py            keys, CSRs, registration with ANS (keys stay in keys/, gitignored)
  ans/                   ANS client: sim_client.py (local) and godaddy_client.py (real API)
  crypto.py, merkle.py   certificates, signatures, transparency-log proofs
  skills.py              agent brains: Gemini prompts and offline templates
  agent_base.py          the web service every agent runs (/card, /challenge, /job)
services/
  ans_sim/               local ANS: Registration Authority, CA, transparency log, DNS
  hub/                   event stream, demo controls, serves the dashboard
  agents/                commander.py, vendor.py, impostor.py
dashboard/               plain HTML/CSS/JS, no build step
scripts/                 run_all.py, smoke_test.py, register_agents.py
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

1. Get an API key at [AgentNameRegistry.org](https://www.AgentNameRegistry.org).
2. Open `mc/ans/godaddy_client.py` and check every `TODO(verify)` against GoDaddy's API docs. The endpoint paths and field names there are educated guesses. Nothing else in the codebase needs to change.
3. Buy or borrow a domain per organization, deploy each agent to it, and set `AGENT_ENDPOINT_<KEY>` in `.env`.
4. Set `ANS_BACKEND=godaddy` and run `python scripts/register_agents.py`. It prints the DNS TXT record to add for each domain.

Note: real ANS can't un-revoke an agent, so on the real backend **Reset demo** can't restore a revoked vendor. Register a new version instead.

## Honest framing for judges

The five companies are fictional and all built by our team. Every registration, certificate, signature, revocation and log proof is real cryptography. With the simulator, the ANS side runs locally; with `ANS_BACKEND=godaddy`, it's GoDaddy's.
