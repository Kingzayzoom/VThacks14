# Phase A verification

Environment: Windows PowerShell, Node 24.20.0, npm 11.19.0, Next.js 16.3.5, React 19.3.0. Browser: Playwright Chromium / Chrome for Testing 153.0.8010.12, headless. These checks do not establish physical-device performance.

## Commands actually run
| Check | Result |
| --- | --- |
| npm.cmd run typecheck | PASS, strict TypeScript |
| npm.cmd run lint | PASS, Next core-web-vitals / TypeScript rules |
| npm.cmd test | PASS, 6 tests |
| npm.cmd run build | PASS, production compilation and route generation |
| npm.cmd run test:e2e against development server | PASS, primary interaction/accessibility flow |
| Production browser run plus 1280/1920 layout check | PASS, 2 browser tests in 9.7 seconds against local production server on port 3001 |

## Unit/contract coverage
1. Empty mode selects demo; invalid/live configurations fail closed, even with a provided key; HTTP adapter reports NOT_CONFIGURED.
2. Blank and oversized objective validation.
3. Concurrent idempotent submissions create one mission; changed payload with same key is rejected; no premature task completion.
4. Pause/resume preserves pending review, suppresses running state, rejects duplicate pause changes, and maintains unique sequence numbers.
5. Persisted demo round-trip; malformed JSON/unknown schema safely falls back.
6. Fixture identity never grants broad scope or supplies a fabricated endpoint; unknown event type fails validation.

## Browser coverage
- Entry validation, example filling without submission, double-click submission, created mission navigation, reload persistence and mission count.
- Mission switching, agent inspector evidence/scopes, graph/list, pause/resume edge state.
- Capability-request preview, Escape dismissal and focus return.
- Voice-not-configured state and text-input focus handoff.
- Reduced-motion behavior; no page exceptions and no requests outside the local app origin.
- 390px horizontal-overflow check, list replacement for graph, direct pending-review access, mobile navigation Escape/focus and settings.
- axe WCAG 2 A/AA and WCAG 2.1 AA checks: desktop FIELD, mobile entry and mobile FIELD, zero violations in the final passing run. This is automated coverage, not a full accessibility certification.

## Visual QA
Inspected real entry and FIELD screenshots against the four input boards. Corrected initial excess desktop height, task/control hierarchy, dense rail scrolling, mobile review order and artwork opacity. Fixed an actual focus handoff defect and made scrolling regions keyboard-focusable. Initial test selector ambiguity with Next's route announcer was fixed in the test.

Screenshots live in `docs/screenshots/`; desktop entry and FIELD are exactly 1440×900, mobile runs use a 390×844 viewport with full-page captures as well. Additional 1280×800 and 1920×1080 viewport captures were inspected: no horizontal overflow; the 1280px page naturally scrolls vertically. Reference PNGs are not requested by the running application. The final primary flow was repeated against the optimized production build, not only the dev server.

## Environment hygiene
Verified `.env.example` contains 41 names with no populated values. `.env.local` contains all 41 required names; existing values were not printed or overwritten. Provider secrets have no NEXT_PUBLIC prefix. No provider SDK, paid call, microphone session or deployment was initiated.

## Not tested / not implemented
Full Phase B scenario and failure branches; real ANS, Gemini, ElevenLabs, runtime, auth and policy gateway; durable storage; SSE reconnect/out-of-order replay; Safari/Firefox; real screen readers; physical mobile devices; formal contrast review of every decorative detail; performance traces, FPS and long-task measurements. No live integration is marked PASS.
