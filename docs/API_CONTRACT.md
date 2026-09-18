# Initial application contract / v1

Phase A seam for discussion with Zabish and Ashraf. These are PERIHELION application types, not provider payloads. No HTTP endpoint in this document is implemented yet.

`src/contracts/index.ts` provides Zod runtime schemas for Agent, Mission, Task, Snapshot, CreateMissionRequest, and the four initial event variants. Recruitment, ActionRequest, Approval, Incident, Artifact, and IntegrationStatus have initial TypeScript definitions; their runtime validators and full flows belong to B/C.

## Current adapter
UI components consume `ControlApi`; `MockControlApi` stores fixtures in memory, optionally persisted under `perihelion:phase-a:v1`. `createHttpControlApi` fails with `NOT_CONFIGURED`. Root server configuration also rejects live mode; populated keys cannot activate an SDK.

Implemented local operations:
- `getSnapshot`, `getServerSnapshot`, `subscribe`.
- `createMission({ objective, idempotencyKey })`: trimmed 1–2,000 characters, one result per key. Reusing a key with another objective fails. Maximum 30 missions per device snapshot.
- `selectMission(id)`, `selectAgent(id)` retain navigation context.
- `commandMission(id, 'pause' | 'resume')`: synchronous demo acknowledgment inside a Promise; stops visual execution and preserves the review state. No external action is canceled or undone.

## Proposed HTTP shape
`POST /api/missions`, authenticated workspace session, `Idempotency-Key` header:

```json
{ "objective": "Prepare a launch brief using public sample data." }
```

Response should be a validated mission plus `schemaVersion: 1` and a server correlation ID. Repeated keys must return the same mission for the same authenticated actor/workspace and payload. Browser-generated IDs do not establish authority.

`POST /api/missions/:id/commands` accepts `{ "command": "pause" }`. Live pause needs an explicit pending/acknowledged lifecycle; the immediate local acknowledgment is not a durable-job contract.

`GET /api/bootstrap` should return a sanitized snapshot and stream cursor. `GET /api/events/stream` is the proposed SSE channel, behind the adapter. Hosted services own jobs and persistence.

The full endpoint proposal remains in MASTER_PROMPT.md §20. Recruitment/Guardian/voice routes are deliberately unimplemented at this checkpoint.

## Events and errors
Envelope: schemaVersion, id, sequence, occurredAt, source, missionId, optional agentId/taskId/correlationId, discriminated type and validated payload.

Current variants: `mission.created`, `mission.state_changed`, `task.progress`, `capability.missing`. Fixture timestamps belong to a labeled seeded scenario; newly created events use actual creation time. The UI uses sequence numbers instead of claiming current server timestamps.

Sequence is global within the local workspace, monotonically increasing; event memory is bounded to 200 records. No stream ingestion/reconciliation exists yet. Unknown persisted schema versions, malformed JSON and non-demo agent/event records fall back safely to the seed. Phase C must implement duplicate-event IDs, out-of-order handling, stale snapshots, reconnect cursors and canceled runs before HTTP/SSE wiring.

Error codes: NOT_CONFIGURED, UNAUTHORIZED, FORBIDDEN, INVALID_REQUEST, RATE_LIMITED, UPSTREAM_UNAVAILABLE, TIMEOUT. The mock currently emits INVALID_REQUEST and RATE_LIMITED; the HTTP boundary emits NOT_CONFIGURED.

## Authorization seam
Identity verification is not execution permission. Live admission/one-time decisions must be bound to actor, workspace, mission, exact immutable payload, scopes, expiry and idempotency key. The server policy gateway must authenticate and authorize every mutation. No browser fixture is an enforcement mechanism.

Budget values are integer minor units with explicit currency and basis. Unknown is null, never a fabricated cost estimate. Provider model IDs and runtime endpoints remain teammate configuration.
