# Live integration checkpoint

The approved frontend is preserved. This branch includes the earlier reset, finish, atmosphere, motion and page-transition commits. No deployment was performed.

## Architecture

Text composer or ElevenLabs CONTROL `start_mission` → shared `ControlApi.createMission` → same-origin Next proxy → existing Python hub → Commander (`mc.skills` / `mc.planning`) → ANS → specialists → independent deterministic Guardian → hub WebSocket → Next SSE bridge → existing external store and screens.

`CORTEX_RUNTIME_MODE=demo` (also the empty default) selects MockControlApi. `live` selects HttpControlApi with an empty initial store, never demo fixtures. Server-only `CORTEX_HUB_URL` defaults to `http://127.0.0.1:8000`. Next reads mode at request time, so one production build supports both modes.

Mapping preserves five trust checks, separate signed standing, actual unexpired Guardian grants and runtime. Simulator evidence stays labeled even with a live hub connection. Recruitment and action decisions occupy the existing context panels. Results use an empty iframe sandbox and a restrictive CSP. Voice cannot approve actions.

## Verification

- Typecheck, ESLint and production build: pass.
- JavaScript unit tests: 20 pass.
- Python: 124 pass using `.venv\Scripts\python.exe -m pytest -q`.
- Demo browser suite: 17 pass; the real-hub test is skipped in that run.
- Separate real-hub browser test: pass at desktop 1440×900 and mobile 390×844. Covers mission creation, streamed task/result updates, simulator evidence, search, sandbox and horizontal overflow.
- Axe checks the CORTEXAI interface. Generated sandboxed result content is excluded: injecting audit JavaScript would violate its sandbox.
- Screenshots: `screenshots/integration/live/` and `screenshots/integration/demo/`.

The requested dental-practice objective was submitted through the actual composer. The hub planned and delivered `brand.identity`, `site.generate` and `compliance.review` tasks with signed results. It reported engine `offline`, using the existing fallback. This proves integration, not Gemini generation quality.

## External checks and blockers

| Service | Actual result |
| --- | --- |
| Python hub | Reachable on port 8000; real mission and event stream tested |
| Gemini | Not contacted: GEMINI_API_KEY absent from existing environment files |
| ElevenLabs | Contacted; token API returned HTTP 401. App safely returned 502; no token, microphone or conversation started |
| ANS | Local simulator, explicitly labeled; no hosted GoDaddy verification claimed |

No `.env` or `.env.local` values were changed. A working Gemini key and valid ElevenLabs credential/agent access are still needed for an end-to-end spoken Gemini test.

## Exact local commands (PowerShell)

First-time dependencies, from the repository root:

```powershell
npm.cmd install
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Terminal 1 — backend:

```powershell
.venv\Scripts\python.exe scripts/run_all.py --no-browser
```

Do not add `--fresh`; it deletes local keys/state. The existing runner resets rehearsal missions and Guardian state on startup. Stop any existing backend instance first. Python loads `.env`; a working `GEMINI_API_KEY` must already exist there or in this terminal's environment. `LLM_MODE=auto` permits the existing labeled offline fallback; `gemini` forces visible failure when Gemini is unavailable. This pass did not change those values.

Terminal 2 — frontend:

```powershell
$env:CORTEX_RUNTIME_MODE = 'live'
$env:CORTEX_HUB_URL = 'http://127.0.0.1:8000'
npm.cmd run dev -- --port 3000
```

Open http://127.0.0.1:3000. Verify a text mission first. Correct the current ElevenLabs HTTP 401 issue in the private server configuration; it needs `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` and `CORTEX_VOICE_ACCESS_CODE` (at least 24 characters). Configure the dashboard client tool as described in [VOICE_HANDOFF.md](VOICE_HANDOFF.md). Open **Talk to CONTROL**, enter the private team access code, click **Start voice**, and ask it to start the dental-practice objective. Confirm the tool returns a mission ID and opens the existing mission screen. Never enter provider keys in the UI.

For demo rehearsals, set `CORTEX_RUNTIME_MODE` to `demo`; no hub or provider is required.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
npm.cmd run build
.venv\Scripts\python.exe -m pytest -q
```

Browser checks against a demo server:

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3000'
$env:SCREENSHOT_DIR = 'docs/screenshots/integration/demo'
npm.cmd run test:e2e
```

Separate real-hub check, with both servers running and frontend mode live:

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3000'
$env:LIVE_E2E = '1'
npm.cmd run test:e2e -- e2e/live-integration.spec.ts --output test-results/live
```

Do not run browser suites concurrently against the same output directory.

## Existing backend limits

Mission storage and idempotency are process-local, not durable or coordinated across workers. The hub has current/per-ID reads but no full mission-list endpoint: the UI lists observed missions and recovers the current mission on reload. Reconnect stops after five retries; reload to reconnect afterward. No pause/resume endpoint exists, so those controls are unavailable in live mode. Visual version/Guardian decisions remain available. The existing local hub is not a production account-authentication system; deployment remains outside this checkpoint.

## Changed files

- Core: `src/lib/api/{HttpControlApi,ControlApi,hub-mapping,hub-proxy,same-origin}.ts`, `src/app/api/control/{[...path],events}/route.ts`, `src/contracts/index.ts`, `src/lib/env/config.ts`, `src/components/provider.tsx`, `src/app/layout.tsx`.
- Voice: `src/lib/voice/{session-client,session-server}.ts`, `src/components/voice/voice-panel.tsx`.
- Screen bindings: `src/components/{live-status,field,missions,entry,shell,ui}.tsx`, `src/components/agents/agents-console.tsx`, `src/app/(workspace)/settings/page.tsx`, `src/lib/demo/fixtures.ts`. No atmosphere, typography, layout CSS or transition implementation changed in this integration.
- Backend: `services/agents/commander.py` — objective validation and optional idempotency key only.
- Tests: `tests/{control,voice,live-control}.test.ts`, `tests/test_mission_submission.py`, `e2e/live-integration.spec.ts`.
- Guidance/evidence: `AGENTS.md`, `PRODUCT.md`, `docs/{onboarding,status,contracts,BUILD_STATUS,TEST_RESULTS,VOICE_HANDOFF,LIVE_INTEGRATION}.md` and integration screenshots.
- The pre-existing ElevenLabs React dependency addition is retained in `package.json` / `package-lock.json`. The integration uses the existing client SDK.
