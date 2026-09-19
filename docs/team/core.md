# Brief: Trust, Guardian and orchestration (Zay)

The core. You built most of it; this is the record of what is yours, what is left, and what to
protect while three other people work around you.

---

## What you own

```
mc/trustgate.py              the five checks, signed-deliverable verification
mc/guardian.py               grants, scopes, the policy engine
mc/standing.py               status tokens
mc/planning.py               plan validation
mc/crypto.py  mc/merkle.py   certificates, signatures, transparency-log proofs
mc/identity.py               keys, CSRs, registration
services/agents/commander.py planning, hiring, the execution graph
services/hub/guardian.py     the gateway agents must ask before acting
services/ans_sim/            the local ANS
config/agents.yaml           the policy block
```

## What is done

Everything in [`../status.md`](../status.md) §4. The short version: five-stage Trust Gate with
per-check evidence and four states; standing separated from inclusion, verified offline from
tokens agents present; deliverables bound to their job and mission; mission-scoped expiring
grants; a deterministic policy engine with hard denies, scope matching and single-use human
review; network actions performed by the Guardian rather than the agent; plans as validated
dependency graphs with a bounded retry; roster-based recruitment with replacement handling.

90 unit tests, all five scenarios green end to end.

## What is left, in priority order

### 1. The Gemini split — hand off, don't build
It is written up in [agents-and-demo.md](agents-and-demo.md) tasks 1–2 and it is theirs. Your
part is reviewing that the deterministic review floor is genuinely deterministic — if the model
can suppress a rule finding, the floor is not a floor.

### 2. Verify the planner against a real model
The plan validation and retry loop are unit-tested against a scripted model but have **never run
against Gemini**. When the key lands, watch for: plans that validate but are semantically silly,
retry prompts that make things worse rather than better, and unsupported capabilities being
reported honestly. This is your code and only you will spot it going subtly wrong.

### 3. The hybrid live-ANS mode — about an hour, if asked
If deployment does not come together, Live ANS will need one agent talking to GoDaddy while the
rest use the simulator. `ANS_BACKEND` is global today. Cleanest approach is a per-agent backend
override in config, resolved in `get_ans_client()`. **Do not start this speculatively** — only if
deployment is genuinely in trouble by Saturday afternoon.

### 4. Inbound evidence symmetry — ten minutes, low value
Outbound checks verify presented status tokens offline; inbound checks (a vendor verifying the
Commander's job request) still fetch from the registry, because the evidence would have to ride
on the request rather than the response. Currently 5 presented, 6 fetched per run. Have the
Commander attach its token to job POSTs and read it in `agent_base.job()`. Nice-to-have.

### 5. Things deliberately not done
- **COSE/SCITT parsing.** Crypto written in a rush. Use GoDaddy's `ans-verify`.
- **mTLS / DPoP.** Our nonce challenge answers the same question against the same certificate.
  It is labelled honestly as ours throughout and that is the right call for a weekend.
- **Event sequence numbers and cursors.** Single hub, no duplicates, history replays on connect.
  Nothing a judge sees changes.

## What to protect

Three other people are working around you and the pressure will be to soften things. The
temptations, and the answers:

**"Can we make `unverified` pass, just for the demo?"** No. The whole product is the distinction
between evidence that says no and evidence we could not get. If live ANS cannot supply proofs,
the honest demo is the simulator.

**"The endpoint check is blocking us."** It is supposed to, and it will bite during deployment
when registered URLs do not match where agents actually run. The fix is to make them match, not
to remove the check.

**"Can the Commander skip the Guardian for this one thing?"** No. A Guardian the Commander can
route around is decoration.

**"The review loop didn't fire this run."** That is the Gemini trap in
[agents-and-demo.md](agents-and-demo.md) task 1. Fix the floor, not the gate.

## Review checklist for other people's PRs

- Does any UI path render `unverified` as a pass?
- Does any new code let model output reach a policy decision?
- Does any event carry a key, token or PAT?
- Does anything appear in the UI on a timer rather than an event?
- If an API shape or event changed, was [`../contracts.md`](../contracts.md) updated in the same
  commit?
- Does `pytest` pass, and does `scripts/smoke_test.py` still assert all five scenarios?

## Your standing tasks

- **Keep [`../status.md`](../status.md) current.** It is the team's source of truth and it goes
  stale in hours.
- **Merge `main` often.** Four branches, one weekend.
- **The name is settled: CortexAi.** Renamed across both halves. Anything still saying PERIHELION
  or Mission Control outside the archived briefs is a leftover — fix it in passing.

## The thing only you can do on Sunday

When a judge asks a hard question about what the cryptography actually proves, you are the one
who knows. The answer that wins is precise, not expansive:

> ANS proves who an agent is and that it is in good standing right now. Our Guardian decides
> whether a specific action is permitted. Neither proves the agent's output is *correct* — and
> we keep those three claims separate, which is why the Trust Gate has five rows instead of one
> green light.
