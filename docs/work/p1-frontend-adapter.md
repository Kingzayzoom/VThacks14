# P1 — Frontend data adapter

**Paste [`../onboarding.md`](../onboarding.md) first, then this file.**

Branch: `p1-adapter`. Critical path.

---

## The job

The Next.js app is finished and beautiful and **makes no network calls at all**. Your job is to
make real data flow into it without changing a single component.

```
src/lib/api/HttpControlApi.ts   throws NOT_CONFIGURED today — you implement it
src/components/provider.tsx     hardwired to MockControlApi — you make it choose
src/lib/env/config.ts           live mode reports available: false — you change that
```

Everything the UI renders comes through `ControlApi`. Implement the live one against the backend
and the existing views light up.

## Files you own

```
src/lib/api/HttpControlApi.ts     implement it
src/lib/api/backend-map.ts        new — the translation layer, the bulk of the work
src/lib/env/config.ts             allow live mode
src/components/provider.tsx       pick the adapter by mode
```

**Do not touch** anything in `src/components/` other than `provider.tsx`, and do not touch
`src/contracts/index.ts` — P2 may be extending it. If you need a new type, put it in your own
`backend-map.ts`.

## What the backend actually gives you

Everything is on the hub at `http://127.0.0.1:8000`. Never call agents or ANS directly.

**Real captured responses are in [`fixtures/`](fixtures/)** — build against those, they are exact.
[`../contracts.md`](../contracts.md) is the written reference.

```
GET  /api/state                      agents: ans_name, org, version, status, capabilities, fingerprint
GET  /api/missions/current           {mission: {...} | null}
GET  /api/missions/{id}
POST /api/missions                   {text, scenario:{impostor,revoke,upgrade,exfil,publish}}
POST /api/missions/{id}/decision     {decision: "approve"|"reject"}   version-upgrade pause
GET  /api/guardian/incidents         every action requested and how it was answered
POST /api/guardian/incidents/{id}/decision  {decision:"approve"|"reject"}
GET  /api/integrations/status
WS   /ws                             {kind:"history",events:[...]} once, then {kind:"event",event}
```

The pattern that works: **subscribe to `/ws` to know something changed, poll REST to learn what it
changed to.** The old `dashboard/app.js` does exactly this in ~60 lines and is worth reading as a
reference implementation — it is plain JS and it is wired to everything.

## The mapping problem

The frontend's types were written from the original brief; the backend grew differently. You are
writing the translation. The differences:

| | Backend sends | `src/contracts` expects |
|---|---|---|
| casing | `snake_case` | `camelCase` |
| event envelope | `{id, ts, type, message, actor, subject, mission_id, data}` | `{schemaVersion, id, sequence, occurredAt, source, missionId, correlationId, type, payload}` |
| event types | 32 real ones | 4 defined |
| mission | `text`, `jobs[]`, `hires[]`, `recruitments[]`, `roster[]`, `plan` | `objective`, `taskIds[]`, `budget`, `currentStage` |
| agent identity | five checks, each with four states and evidence | one `identityStatus` enum |

Three rules for the mapping, in order of importance:

**1. Never invent a value.** If the backend does not send `budget`, map it to `null`. Do not
compute a plausible-looking number. Same for anything else with no source.

**2. Never collapse `unverified` into `pass`.** Trust checks have four states — `pass`, `fail`,
`unverified`, `not_run`. `unverified` means *we could not get the evidence*; it refuses the hire
but is not the agent's fault. If the target enum has no room for it, **widen the enum** rather
than rounding it to something that looks fine. This is the one thing in this packet that is not a
judgement call.

**3. Carry the detail through.** The five per-check rows, their `detail` strings and their
`evidence` objects are the product. Map them into something P2's Trust Gate view can render — even
if today's components only show a summary. Losing them in translation is the failure mode here.

## Tasks, in order

1. **Read `fixtures/events-by-type.json`.** 32 real event shapes. This tells you more in five
   minutes than any amount of doc reading.
2. **`backend-map.ts`** — pure functions, no I/O: `mapAgent`, `mapMission`, `mapEvent`,
   `mapIncident`. Pure means testable; add tests under `tests/` with `npm test`.
3. **`HttpControlApi`** — fetch the REST routes, open the WebSocket, keep the same store shape
   `MockControlApi` exposes (`getSnapshot` / `subscribe` / `getServerSnapshot`) so components do
   not change. Reconnect on socket close; the history frame replays state, so a drop is recoverable.
4. **`provider.tsx`** — choose the adapter from `CORTEX_RUNTIME_MODE`. Demo stays the default.
5. **`createMission`** — POST `/api/missions`. Note the backend field is `text`, not `objective`.
6. **Failure states.** Backend down must render as "backend unavailable", never as an empty
   successful-looking dashboard. This is house rule 1.

## Done when

- [ ] `CORTEX_RUNTIME_MODE=live` with the backend running shows a real mission, real agents, real events
- [ ] Launching a mission from the UI starts a real one
- [ ] The version-upgrade pause is answerable from the UI and the mission continues
- [ ] Killing the backend shows an honest error, not a blank success
- [ ] Demo mode still works untouched with the backend down
- [ ] `npm run typecheck && npm run build` clean

## Verify

```bash
python scripts/run_all.py --fresh      # backend, port 8000
npm run dev                            # frontend
npm run typecheck && npm run build
```

If results look stale or strange, check nothing else is already holding port 8000.

## Blocked?

- Shape unclear → look in `fixtures/`, it is real captured output.
- Backend field missing → say so; P3 owns adding it. Do not fake it.
- Need `pause`/`resume` → does not exist yet; P3 is building it. Leave the control disabled.
