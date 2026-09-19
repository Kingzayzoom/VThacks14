# P4 — Live GoDaddy ANS and deployment

**Paste [`../onboarding.md`](../onboarding.md) first, then this file, then
[`../godaddy-questions.md`](../godaddy-questions.md).**

Branch: `p4-live-ans`. High priority — this is the prize track.

---

## The job

Everything runs against a local ANS simulator today. Real X.509, real ECDSA, real Merkle proofs —
hosted on a laptop. Make it run against **GoDaddy's actual Agent Name Service**.

The track is "Best Use of ANS". You own the part that decides whether it lands.

## Files you own

```
mc/ans/godaddy_client.py      the adapter — written from the docs, never executed
mc/ans/base.py                the interface both backends implement
scripts/check_ans.py          read-only preflight
scripts/register_agents.py    registration
deployment/                   yours to create
.env.example                  configuration
config/agents.yaml            the agents: domains and endpoints only
```

**Do not touch** `mc/trustgate.py`, `mc/standing.py`, `mc/guardian.py` or the Commander. If a trust
check behaves oddly against live ANS, describe it to Zay rather than changing it.

## Where it stands

`godaddy_client.py` was written against GoDaddy's **published REST reference** — real endpoints,
real field names, the documented revocation enum, the DNS-01 flow. What it has never had is a
token, so **not one line of it has run**. Closing that gap is the whole packet.

| | |
|---|---|
| Auth | `Authorization: Bearer <pat>`, with an `ANS_AUTH_MODE=sso-key` fallback |
| Base | `https://api.ote-godaddy.com` (OTE) / `https://api.godaddy.com` |
| Transparency log | `transparency.ans[.ote]-godaddy.com`, derived from the API URL |
| Register | `POST /v1/agents/register` — `agentDisplayName`, `agentHost`, `version`, `identityCsrPEM`, `endpoints[].functions[]` |
| Validate | DNS-01 challenge, then `POST /v1/agents/{id}/verify-acme` |
| Resolve | `POST /v1/agents/resolution` by host and version |
| Discover | `GET /v1/ans/registered-agents?capabilities=` |
| Identity cert | `GET /v1/agents/{id}/certificates/identity` |
| Revoke | `POST /v1/agents/{id}/revoke` with the reason enum |

## Step 1 — the credential (blocks everything else)

Take [`../godaddy-questions.md`](../godaddy-questions.md) to the sponsor. **Ask question 1 first:**
which credential, which environment, what PAT scope.

```dotenv
ANS_API_URL=https://api.ote-godaddy.com
ANS_PAT=<their token>
```

## Step 2 — thirty seconds that replace a day of guessing

```bash
python scripts/check_ans.py
```

Read-only: it resolves, searches and reads, and registers or revokes nothing. It reports, endpoint
by endpoint, which documented assumptions survived contact. **Every failure is either a bug in our
mapping — yours to fix — or a question for the sponsor.** Work the list until it is green.

## Step 3 — the domain

We own **`getcortex.vip`**, registered at **Porkbun** (not GoDaddy; that only changes which DNS
console you use — ANS proves control with a TXT record and does not care who the registrar is).

**Do not edit the domains in `config/agents.yaml`.** It is already a switch:

```dotenv
ANS_DOMAIN=getcortex.vip
```

Unset, each agent keeps its own fictional domain — five separate organisations, the right shape
for the story, impossible to register because we do not own `brandstudio.xyz`. Set, all five move
to subdomains we can prove control of:

```
commander.getcortex.vip   brand.getcortex.vip      webforge.getcortex.vip
sitesmith.getcortex.vip   compliance.getcortex.vip
```

**Both modes already pass the full demo end to end**, so the configuration is known good before it
meets GoDaddy.

Worth ten minutes: Porkbun API access is currently off. Turning it on gives you a key, and a small
script can add all five TXT records instead of hand-entering them at 2am. The key lives in `.env`.

## Step 4 — deployment, the part people underestimate

**Registering `https://brand.getcortex.vip` means the agent has to actually be there.** ANS hands
that URL to whoever is hiring; we fetch its card from it and challenge it. And our policy check
refuses an agent answering from an address ANS does not list — so registering public URLs while
running on `127.0.0.1` fails **by design**, not by accident.

| Option | Effort | Notes |
|---|---|---|
| **Cloudflare Tunnel** | ~1 hour | five subdomains to five local ports, free, no server. Best bet. |
| VPS and reverse proxy | hours | more control, more to go wrong at 2am |
| **Hybrid** | ~1 hour of code | see below |

Set endpoints to match what was registered — `.env.example` has the list commented out.

### The hybrid — read before committing to full deployment

Register **one** agent for real. Show GoDaddy resolving and verifying it live on stage. Run the
mission on the simulator.

You get the integration credit without betting the demo on tunnels holding at 2am. Needs a small
code change (one agent live, rest simulated) — talk to Zay, about an hour. **If deployment is not
comfortably working by Saturday afternoon, take this.**

## Step 5 — registration

```bash
ANS_BACKEND=godaddy python scripts/register_agents.py
```

Key and CSR per agent, submit, print the DNS TXT record, wait, complete ACME validation.

**There is no un-revoke.** Never revoke an identity you need on Sunday. Register a sacrificial one:

```
sitesmith.getcortex.vip  v1.0.0   <- the real one. DO NOT REVOKE.
sitesmith.getcortex.vip  v0.0.1   <- sacrificial. Revoke this live.
```

**Never commit keys.** They land in `keys/`, gitignored. If one reaches the repo the identity is
burned and you register a new version.

## Step 6 — two things that will still be missing

Both already fail *honestly*, so the system stays usable while you work.

**SCITT receipts.** Hosted receipts are COSE_Sign1; ours are JSON. `mc/merkle.py` cannot read them.
**Do not write a COSE parser this weekend.** Ask about `ans-verify` (question 4). Until then the
status check reports inclusion as `unverified`, which refuses the hire and says why.

**The CA trust anchor.** `chainPEM` arrives with each identity certificate, but a chain handed over
by the party you are checking is not a trust anchor. Ask question 3, then set `ANS_CA_BUNDLE_PATH`.

## Done when

- [ ] `check_ans.py` is green, or every failure is a written sponsor question
- [ ] At least one agent registered, resolved and verified against live ANS
- [ ] Every mapping bug the preflight found is fixed
- [ ] A sacrificial identity exists for the revocation demo
- [ ] Either the full mission runs live, or the hybrid works and we know which we are demoing
- [ ] `pytest` still passes and the simulator path still works — live mode must not break demo mode

## Blocked?

- **Sponsor unavailable** — deployment is entirely independent of the credential. Do that.
- **Endpoint 404s** — check OTE against production first. Mixing environments verifies nothing.
- **Everything 401s or 403s** — the auth scheme. Try `ANS_AUTH_MODE=sso-key`. That is question 1
  answering itself the hard way.
