# Questions for the GoDaddy table

Everything in the public ANS docs is already implemented. These are the things the docs don't
settle — environment and policy, not protocol. Six questions, in the order that unblocks the
most code.

**The one-paragraph version, if you only get a minute:**

> We've implemented against the public ANS REST API — registration with `identityCsrPEM`,
> DNS-01 plus `verify-acme`, resolution by host and version, capability search over
> `registered-agents`, the revocation enum, and offline verification of status tokens. We need
> four environment answers: which credential and PAT scope for the hackathon; what CA root our
> verifier should trust; the recommended hosted flow for obtaining and refreshing SCITT receipts
> and status tokens; and what verifier you'd recommend for a Python backend. Also: can our
> agents be subdomains of one apex domain, and what registration limits apply?

---

### 1. Which credential, and for which environment?

> The REST catalog lists ANS as PAT. Is that what you're issuing for VTHacks, and what scope or
> entitlement does it need? Is our token good for OTE, production, or both?

*Why it's first:* nothing else can be tested until this works. We default to
`Authorization: Bearer <pat>` and `https://api.ote-godaddy.com`, with `ANS_AUTH_MODE=sso-key`
available if you tell us the catalog is out of date for the hosted service.

### 2. How should we obtain and refresh status tokens?

> Should the agent attach `X-ANS-Status-Token` and `X-SCITT-Receipt` to its own responses, and
> which SDK call obtains or refreshes them? Is there a retrieval endpoint on
> `transparency.ans.ote-godaddy.com` if nothing was presented?

*Why it matters:* we've built for the presented-and-verified-offline model, which is what makes
verification sub-millisecond and survive the registry being unreachable. Our fallback path
(fetching a token from the transparency log) is the one part of the client still guessed.

### 3. What CA root should we pin?

> `GET /certificates/identity` returns `chainPEM`, but a chain supplied by the party we're
> checking isn't a trust anchor. Is there a canonical ANS identity CA root to pin, or should the
> SDK verifier own this?

*Where we are:* `ANS_CA_BUNDLE_PATH` is wired and unset. Until it's set, the live backend can't
anchor a certificate chain.

### 4. What verifier for a Python backend?

> Our orchestrator is Python. Is there an official Python verifier for SCITT receipts and status
> tokens, or should we shell out to `ans-verify` / run a Go sidecar?

*Where we are:* we verify our simulator's JSON receipts natively, and we deliberately have **not**
written a COSE parser. Hosted receipts are SCITT COSE_Sign1; we'd rather call your verifier than
reimplement it the night before judging.

### 5. Subdomains under one apex?

> `agentHost` is an FQDN and the domain filter matches apex plus subdomains, so we'd register
> `brand.ourteam.xyz`, `sitebuilder.ourteam.xyz` and so on under one domain we own. Any hackathon
> or registry policy against that?

*Why we ask:* the alternative is buying five domains. The API doesn't appear to require it; this
is a policy confirmation, not a technical one.

### 6. Registration limits, and a disposable identity?

> Are there registration or revocation limits for hackathon teams? We'd like one throwaway
> identity or version specifically to revoke live on stage.

*Why:* there's no un-revoke. We are not burning an identity we need for judging. The plan is a
sacrificial version — `v0.0.1` — revoked live while the real agent stays on `v1.0.0`.

---

## What we've already built against the public docs

So you can skip anything on this list:

| | |
|---|---|
| Auth | `Authorization: Bearer <pat>`, `ANS_AUTH_MODE=sso-key` fallback |
| Register | `POST /v1/agents/register` — `agentDisplayName`, `agentHost`, `version`, `identityCsrPEM`, `endpoints[].functions[]` |
| Validate | DNS-01 challenge → `POST /v1/agents/{id}/verify-acme` |
| Resolve | `POST /v1/agents/resolution` by host + version |
| Discover | `GET /v1/ans/registered-agents?capabilities=`, falling back to the search form |
| Identity cert | `GET /v1/agents/{id}/certificates/identity`, SAN URI checked against the ANS name |
| Revoke | `POST /v1/agents/{id}/revoke` with the documented reason enum |
| Standing | status tokens verified offline against root keys; presented by the agent, fetched only as fallback |
| Transparency | `transparency.ans[.ote]-godaddy.com`, defaulted from the API environment |

Run `python scripts/check_ans.py` with a token to see which of these survive contact. It's
read-only — it registers and revokes nothing.

## Known gaps we are not asking you to fix

- **Proof of possession.** ANS specifies mTLS and DPoP. We run our own nonce-and-signature
  challenge against the same ANS-issued certificate. It answers the same question; it is not your
  mechanism and we don't describe it as one.
- **SCITT COSE_Sign1.** Not implemented. See question 4.
