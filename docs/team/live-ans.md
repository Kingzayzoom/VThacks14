# Brief: Live ANS, domain and deployment

**Before anything: paste [`../onboarding.md`](../onboarding.md) into your AI assistant, then this
file, then [`../godaddy-questions.md`](../godaddy-questions.md).**

---

## Your job

Right now the whole system runs against a local ANS simulator. Real cryptography, real
certificates, real Merkle proofs — hosted on a laptop. **Your job is to make it run against
GoDaddy's actual Agent Name Service.**

The prize track is "Best Use of ANS". You own the part that decides whether we win it.

## What you own

```
mc/ans/godaddy_client.py     the adapter — written, documented, never executed
mc/ans/base.py               the interface both backends implement
scripts/check_ans.py         read-only preflight
scripts/register_agents.py   registration
.env.example                 configuration
deployment/                  yours to create
config/agents.yaml           the domains and endpoints only — coordinate on the rest
```

## Where things stand

`mc/ans/godaddy_client.py` is written against GoDaddy's **published REST reference** — not
guesswork. Endpoints, field names, the revocation enum, the DNS-01 flow, all documented. What it
has never had is a token, so **not one line of it has executed.** That is the gap you close.

Already correct as far as the docs go:

| | |
|---|---|
| Auth | `Authorization: Bearer <pat>` (with a `sso-key` fallback if the sponsor says otherwise) |
| Base URL | `https://api.ote-godaddy.com` (OTE) / `https://api.godaddy.com` (production) |
| Transparency log | `transparency.ans[.ote]-godaddy.com`, defaulted from the API URL |
| Register | `POST /v1/agents/register` — `agentDisplayName`, `agentHost`, `version`, `identityCsrPEM`, `endpoints[].functions[]` |
| Validate | DNS-01 challenge → `POST /v1/agents/{id}/verify-acme` |
| Resolve | `POST /v1/agents/resolution` by host + version |
| Discover | `GET /v1/ans/registered-agents?capabilities=` |
| Identity cert | `GET /v1/agents/{id}/certificates/identity` |
| Revoke | `POST /v1/agents/{id}/revoke` with the documented reason enum |

## Step 1 — the credential (do this first, it blocks everything)

Go to the sponsor table with [`../godaddy-questions.md`](../godaddy-questions.md). **Ask question
1 first**: which credential, which environment, what PAT scope.

```dotenv
ANS_API_URL=https://api.ote-godaddy.com
ANS_PAT=<their token>
```

## Step 2 — find out what is actually true (thirty seconds)

```bash
python scripts/check_ans.py
```

Read-only. Registers nothing, revokes nothing. It resolves, searches and reads, then prints
endpoint by endpoint which of our documented assumptions survived contact:

```
Discovery (read-only)
  ✓ PASS  GET /v1/ans/registered-agents  capabilities=site.generate
          3 result(s) — first: ['agent_id', 'ans_name', 'host', ...]

Resolution and identity
  ✗ FAIL  POST /v1/agents/resolution  brand.ourteam.xyz @ 1.0.0
          ANS POST /v1/agents/resolution failed (404): ...
```

**Every failure is either a bug in our mapping or a question for the sponsor.** Fix the mapping
in `godaddy_client.py`; take the rest back to the table. Work through the list until it is green.

## Step 3 — the domain

**We have one: `getcortex.vip`, registered at Porkbun** (not GoDaddy — that only changes which
DNS console you use; ANS proves domain control with a DNS-01 TXT record and does not care who
the registrar is).

**Do not edit the domains in `config/agents.yaml`.** It is already done, as a switch:

```dotenv
ANS_DOMAIN=getcortex.vip
```

Unset, every agent keeps its own fictional domain — five separate organisations, which is the
right shape for the story and impossible to register because we do not own `brandstudio.xyz`.
Set, all five move to subdomains of a domain we can actually prove control of:

```
commander.getcortex.vip    brand.getcortex.vip      webforge.getcortex.vip
sitesmith.getcortex.vip    compliance.getcortex.vip
```

Both modes are tested end to end against the simulator, so the config is known good before you
point it at GoDaddy.

**One thing to be aware of and say out loud on stage:** with every agent on one apex, they visibly
belong to the same owner, which softens the "agents from different organisations" story. That is
the honest trade for being able to register at all, and it is already covered by the framing —
the companies are fictional and all ours; in production each vendor would own its own domain.
If you want the story intact *and* live proof, the hybrid below is the better answer.

You need Porkbun DNS console access — registration returns a DNS-01 challenge and you add a
`_acme-challenge.<host>` TXT record per agent.

**Optional, and worth the ten minutes:** API access is currently off on the Porkbun account.
Turning it on gives you an API key, and a small script can then add all five TXT records instead
of you doing it by hand at 2am. The key lives in `.env` and is gitignored.

## Step 4 — deployment (the part people underestimate)

**This is not optional if you want the full mission running live.** Registering
`https://brand.<domain>` means the agent has to *be* there: ANS hands that URL to whoever is
hiring, we fetch its card from it and challenge it. And our policy check refuses any agent
answering from an address other than the one ANS lists — so registering public URLs while running
on `127.0.0.1` fails **by design**, not by accident.

| Option | Effort | Notes |
|---|---|---|
| **Cloudflare Tunnel** | ~1 hour | Five subdomains → five local ports. Free, no server. Best bet. |
| **A small VPS + reverse proxy** | several hours | More control, more to go wrong at 2am. |
| **Hybrid** | ~1 hour of code | See below. |

Whichever you pick, set the endpoints so they match what is registered — `.env.example` has the
full list commented out:

```dotenv
AGENT_ENDPOINT_BRAND=https://brand.getcortex.vip
AGENT_ENDPOINT_WEBFORGE=https://webforge.getcortex.vip
...
```

### The hybrid — read this before committing to full deployment

Register **one** agent for real. Prove resolution, identity certificate and verification against
GoDaddy's live API on stage. Run the demo mission on the simulator.

You get the ANS integration credit without betting the entire demo on tunnels holding up at 2am.
It needs a small code change (one agent live, the rest simulated) — talk to Zay, it is about an
hour. **If deployment is not comfortably working by Saturday afternoon, take this.**

## Step 5 — registration

```bash
ANS_BACKEND=godaddy python scripts/register_agents.py
```

It generates a key and CSR per agent, submits, prints the DNS TXT record to add, waits, then
completes ACME validation.

**Two warnings.**

**There is no un-revoke.** Revocation is permanent. Do not revoke an identity you need on Sunday.
For the revocation demo, register a sacrificial one:

```
sitesmith.getcortex.vip  v1.0.0   ← the real one. DO NOT REVOKE.
sitesmith.getcortex.vip  v0.0.1   ← sacrificial. Revoke this live.
```

**Never commit keys.** Private keys land in `keys/`, which is gitignored. Keep it that way. If a
key reaches the repo, the identity is burned and you register a new version.

## Step 6 — the two things that will still be missing

Both already fail *honestly* rather than silently, so the system stays usable while you work.

**SCITT receipts.** Hosted ANS receipts are COSE_Sign1; ours are JSON. `mc/merkle.py` cannot read
them. **Do not write a COSE parser this weekend** — that is crypto written in a rush. Ask the
sponsor (question 4) about `ans-verify` or a Go sidecar. Until then the status check reports
inclusion as `unverified`, which refuses the hire and says so.

**The CA trust anchor.** `chainPEM` comes back with each identity certificate, but a chain handed
over by the party you are checking is not a trust anchor. Ask question 3, then set
`ANS_CA_BUNDLE_PATH`.

## Done when

- [ ] `python scripts/check_ans.py` is green, or every failure is a written sponsor question
- [ ] At least one agent registered, resolved and verified against live ANS
- [ ] Every mapping bug found by the preflight is fixed in `godaddy_client.py`
- [ ] A sacrificial identity exists for the revocation demo
- [ ] Either the full mission runs live, or the hybrid works and we know which we are demoing
- [ ] `docs/status.md` updated with what is actually live

One more thing worth checking early: `.vip` is an ordinary gTLD and should be fine, but if any
ANS validation step turns out to be fussy about the TLD, `check_ans.py` is where you will see it
first.

## When you are blocked

- **Sponsor unavailable** → keep working: the preflight tells you a lot with any token, and the
  deployment work is entirely independent of the credential.
- **An endpoint 404s** → check OTE vs production first. Mixing environments is the most common
  cause, and mixing OTE identities with production proofs verifies nothing.
- **Everything fails with 401/403** → the auth scheme. Try `ANS_AUTH_MODE=sso-key`. That is the
  question-1 answer arriving the hard way.
- **The trust code confuses you** → it is not yours to change. Describe the behaviour you are
  seeing to Zay.
