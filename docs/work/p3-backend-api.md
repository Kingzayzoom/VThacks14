# P3 — Backend API for the frontend

**Paste [`../onboarding.md`](../onboarding.md) first, then this file.**

Branch: `p3-api`. High priority — P1 is blocked on two of these.

---

## The job

The frontend needs four things the backend does not do yet, and there are two rival contract
documents that need to become one.

## Files you own

```
services/hub/app.py              the routes
services/agents/commander.py     pause / resume (mission state only)
docs/contracts.md                the single contract
```

**Do not touch** `mc/trustgate.py`, `mc/guardian.py`, `mc/standing.py`, `mc/planning.py` or
`services/hub/guardian.py` — that is the trust core, and it is Zay's. **Do not touch**
`scripts/smoke_test.py` — P6 owns it; tell them what to assert.

## Task 1 — `pause` / `resume` (P1 is waiting on this)

The frontend proposes `POST /api/missions/:id/commands` with `{"command": "pause"|"resume"}`.
Nothing like it exists today.

What pause must and must not mean:

- **It stops the Commander taking the *next* task.** It does not cancel work already in flight
  with a vendor, and it cannot un-send a job that has already gone out.
- **It never weakens a check.** A paused mission that resumes still re-verifies standing before
  handing over the next job, because time passed while it was paused.
- **Report it honestly.** If a job is mid-flight, the response should say the mission will pause
  after the current job finishes, not claim everything stopped dead.

`Mission` already has a state field and an `asyncio.Event` pattern for the version-upgrade pause —
read `ask_approval` in `commander.py` and follow the same shape rather than inventing a second
mechanism.

## Task 2 — idempotency on `POST /api/missions`

The frontend sends an `Idempotency-Key` header and expects the same mission back if it retries.
Today a double-click could start two missions.

Same key + same payload → return the original mission, do not start a new one. Same key +
*different* payload → that is a client bug; reject it. Keep the keys in memory; this does not need
a database.

## Task 3 — `GET /api/bootstrap`

One call that returns what a freshly loaded page needs: agents, current mission, guardian
incidents, integration status, and the event history cursor. Today the frontend has to make four
calls and race them.

It is a composition of routes that already exist. Sanitize the same way they do — **no secrets, in
any field, ever.**

## Task 4 — one contract document

There are two, and they disagree:

- `docs/contracts.md` — mine, describes what the backend actually emits
- `docs/API_CONTRACT.md` — Roheen's, describes what the frontend expected

Fold them into `docs/contracts.md` and leave a one-line pointer in the other. The merged document
must describe **reality**, including anything you add in tasks 1–3. Where the frontend's proposal
and reality differ, reality wins and the difference gets a sentence saying so.

Keep the conventions already in `contracts.md`: every route, every event with its payload fields,
every object shape, and the house rules at the end.

## The rules that apply to everything you add

1. **Never leak a secret.** Not in a response, not in an event, not in an error message.
2. **Fail honestly.** A route that cannot do its job returns an error saying why. It does not
   return an empty success.
3. **Additive only.** P1 is building against today's shapes right now. Add fields; do not rename
   or remove them.
4. **Update `contracts.md` in the same commit** as any shape change. That file is a promise.

## Done when

- [ ] `POST /api/missions/{id}/commands` handles pause and resume, honestly about in-flight work
- [ ] A repeated `Idempotency-Key` returns the original mission instead of starting a second
- [ ] `GET /api/bootstrap` returns everything a cold page load needs, with no secrets
- [ ] One contract document describes reality; the other is a pointer
- [ ] `pytest` passes (100 tests) and `python scripts/smoke_test.py` still passes all five scenarios

## Verify

```bash
pytest
python scripts/run_all.py --fresh
python scripts/smoke_test.py
```

Add unit tests for the idempotency logic and the pause state machine — both are pure enough to
test without a server, which is how the rest of the suite is written.

## Blocked?

- Unsure whether pause should stop something → the honest answer is usually "it stops what has not
  started yet, and says so". Ask rather than guessing.
- A change seems to need the trust core → it does not. Ask Zay.
