# PERIHELION / Phase A visual checkpoint

September 18, 2026. Frontend foundation implemented. Awaiting Roheen's visual review. Do not start Phase B or live integration without the next instruction.

## What works
- Original layered SVG/CSS atmosphere, self-hosted typography, centralized design tokens and responsive shell.
- Entry composer with three examples, blank-input feedback, length limit, keyboard submit and duplicate-submission protection.
- Mission creation → `/missions/[id]` → FIELD, a minimal mission register and integration-readiness page.
- Stable selectable Scout/Sage/Forge/coordinator network; independent Guardian boundary; graph/list switching and view reset.
- Separate identity, authorization, task and evidence inspection; activity stream from shared typed state.
- Task-derived counts, pause/resume visualization, objective details and a read-only capability-request preview.
- Direct pending-review button, touch-friendly mobile agent list, modal keyboard handling and text command dock.
- Optional versioned local demo persistence, malformed-state fallback and a typed API boundary. No real integrations.

## Running locally
PowerShell: `npm.cmd install`, then `npm.cmd run dev`. Open http://127.0.0.1:3000.
Production: `npm.cmd run build`, then `npm.cmd run start` (stop another server on port 3000 first, or pass `-- --port 3001`). Node 24.20.0 was used.

## Files added / changed
The workspace initially had no app, package configuration or AGENTS.md. Original brief and image files remain intact.

| Area | Files |
| --- | --- |
| Project setup | package.json, package-lock.json, tsconfig.json, next.config.ts, next-env.d.ts, eslint.config.mjs, .gitignore, README.md |
| Canonical inputs | MASTER_PROMPT.md, docs/RESEARCH_NOTES.md, public/references/*.png (copies of supplied originals) |
| Private setup | .env.example added with 41 empty values; .env.local existing values preserved and missing names appended empty |
| Routes | src/app/layout.tsx, page.tsx, icon.svg; src/app/(workspace)/layout.tsx, field/page.tsx, missions/page.tsx, missions/[id]/page.tsx, settings/page.tsx |
| UI | src/components/atmosphere.tsx, composer.tsx, dialog.tsx, entry.tsx, field.tsx, missions.tsx, network.tsx, provider.tsx, shell.tsx, ui.tsx |
| Design | src/styles/tokens.css, src/styles/global.css |
| State/contracts | src/contracts/index.ts; src/lib/api/ControlApi.ts, MockControlApi.ts, HttpControlApi.ts; src/lib/demo/fixtures.ts; src/lib/env/config.ts |
| Verification | tests/control.test.ts, e2e/phase-a.spec.ts, playwright.config.ts, docs/screenshots/* |
| Durable handoff | AGENTS.md, PLAN.md, ATTRIBUTIONS.md, docs/DESIGN_SYSTEM.md, docs/API_CONTRACT.md, docs/INTEGRATION_HANDOFF.md, docs/DEMO_SCRIPT.md, docs/TEST_RESULTS.md, this file |

## Visual review
All four supplied boards were inspected before coding. Actual Chromium captures were inspected at 1440×900 and 390px width. Iterations tightened desktop height, increased operational text, separated foregrounds from artwork, moved mobile review above events, and fixed keyboard scrolling/focus handoff.

- [Entry, 1440×900](screenshots/entry-desktop.png)
- [FIELD, 1440×900](screenshots/field-desktop.png)
- [Entry, 390px full page](screenshots/entry-mobile.png)
- [FIELD, 390px full page](screenshots/field-mobile.png)
- [FIELD, 390×844 viewport](screenshots/field-mobile-viewport.png)
- [Capability request preview](screenshots/review-desktop.png)
- [Wide desktop, 1920px](screenshots/field-1920.png) and [compact desktop, 1280px](screenshots/field-1280.png)

Verification: strict typecheck, lint, six unit tests, production build and two production browser tests passed. See TEST_RESULTS.md for actual coverage and limitations.

## Remaining issues / boundaries
No blocking Phase A issue found in the tested browser. The remaining product workflow is deliberately incomplete:

- Custom objectives share the same explicit sample plan; no real planning or automatic progression occurs.
- Recruitment is a pending request preview. Candidate discovery/admission, policy decisions and finished artifacts are Phase B work.
- Agents, Directory, Guardian, Voice and Events sidebar sections are visibly deferred, not fake links. Mission boards/search and command palette are also deferred.
- No stream ingestion/reconciliation, provider failure branches, real identity checks, authenticated policy enforcement, database persistence or microphone capture has been implemented.
- Accessibility checks cover selected states in Chromium; screen-reader, Safari/Firefox, physical-device, 200% text-size and performance profiling are not complete.
- Demo localStorage is device-local, not durable backend storage; the UI remains usable without storage.

No deployment, paid provider operation or external agent action was performed. The exact next step is Roheen's review of the entry and FIELD composition; then proceed to Phase B only after acceptance.
