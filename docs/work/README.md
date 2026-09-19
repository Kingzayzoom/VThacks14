# Parallel work packets

Six packets, drawn so that **no two touch the same file**. Each one is a self-contained brief you
can hand to a separate AI session. They can run at the same time without merge conflicts.

## How to use one

1. Open a fresh session.
2. Paste [`../onboarding.md`](../onboarding.md) — the project context primer.
3. Paste the packet file for that stream.
4. Work on that packet's branch, only in that packet's files.

## The packets

| | Packet | Status | Owns | Priority |
|---|---|---|---|---|
| **P1** | [Frontend data adapter](p1-frontend-adapter.md) | ready | `src/lib/api/`, provider, env config | **critical path** |
| **P2** | [Trust & Guardian views](p2-frontend-views.md) | ready | new components + routes | **critical path** |
| **P3** | [Backend API for the frontend](p3-backend-api.md) | ready | `services/hub/app.py`, contracts doc | high |
| **P4** | [Live ANS + deployment](p4-live-ans.md) | partly blocked | `mc/ans/`, ANS scripts, `deployment/` | high (prize track) |
| **P5** | [Agent output quality](p5-agent-output.md) | ready | `mc/skills.py` | medium |
| **P6** | [Demo script + rehearsal](p6-demo.md) | ready | `docs/demo-script.md`, smoke test | high by Saturday |

**Run three or four at once, not six.** More sessions than that and you spend your remaining time
reviewing merges instead of building. If you must pick, P1 + P2 + P4 are the ones that decide how
the demo looks and whether the prize track lands.

## File ownership — the thing that keeps this working

```
P1   src/lib/api/HttpControlApi.ts   src/lib/api/backend-map.ts (new)
     src/lib/env/config.ts           src/components/provider.tsx

P2   src/components/trust/**         src/components/guardian/**      (all new)
     src/components/recruitment/**   src/app/(workspace)/guardian/**
     src/app/(workspace)/events/**

P3   services/hub/app.py             services/agents/commander.py
     docs/contracts.md

P4   mc/ans/**                       scripts/check_ans.py
     scripts/register_agents.py      deployment/**   .env.example

P5   mc/skills.py

P6   docs/demo-script.md             scripts/smoke_test.py
```

**Two shared files. Do not edit them outside your section:**

- `config/agents.yaml` — P4 owns `agents:` domains and endpoints, P5 owns `llm:` and `job_scopes:`,
  nobody else touches it.
- `docs/status.md` — Zay owns it. Tell him what changed; don't edit it yourself.

**P2 reads `useControl()` but must not edit `provider.tsx`.** Reading someone's file is fine;
editing it is what causes the conflict.

## Real fixtures, so P1 and P2 do not block each other

[`fixtures/`](fixtures/) holds **actual captured output** from a full demo run — not invented
shapes. That is what lets the views be built before the adapter exists.

| File | What |
|---|---|
| `events.json` | 95 events from one complete mission, in order |
| `events-by-type.json` | one example of each of the **32** event types, keyed by type |
| `mission.json` | `GET /api/missions/current` — plan, jobs, hires, recruitments, roster, stats |
| `state.json` | `GET /api/state` — every agent with ANS name, version, status, fingerprint |
| `guardian-incidents.json` | allowed, denied and human-reviewed actions with full decisions |
| `guardian-grants.json` | live scoped grants with expiries |
| `integrations.json` | `GET /api/integrations/status` |
| `transparency-log.json` | ANS log entries |

Regenerate them any time: start the system, run a mission, and re-capture.

## Rules for every packet

1. **Branch per packet:** `git checkout -b p1-adapter` etc. Merge to `main` at least twice a day.
2. **Run the checks before you push.** Python: `pytest` (100 tests, under a second). Frontend:
   `npm run typecheck && npm run build`. Anything structural: `python scripts/smoke_test.py`.
3. **Stay in your files.** If you need something from another packet's territory, write down what
   you need and ask — do not reach in.
4. **The house rules in [`../onboarding.md`](../onboarding.md) §10 are not negotiable.** Never show
   a green check you did not earn; `unverified` is not `pass`; no secret reaches the browser; no
   fake progress; deterministic code decides, the model only explains.
5. **Only one process can hold the ports.** `run_all.py` fails to bind if another instance is
   already up, and then you are testing against stale services. If results look strange, check.

## What is already done

Don't rebuild any of this. Backend is complete and green: five-stage Trust Gate with per-check
evidence and four states, Guardian with scoped expiring grants and a deterministic policy engine,
recruitment with roster reuse and replacement, plans as validated dependency graphs, 100 unit
tests, all five demo scenarios passing end to end. See [`../status.md`](../status.md) §4.
