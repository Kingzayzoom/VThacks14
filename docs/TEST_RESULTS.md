## Layering and atmosphere validation - September 19, 2026

Final build at http://127.0.0.1:3026 (`CORTEX_BUILD_DIR=.next/layering`): typecheck, lint, production build passed; **11 unit tests and all 14 browser tests passed**, zero failures. Axe reports zero violations in tested desktop/mobile states. Existing assertions preserved; added single-background, reduced-motion/mobile suppression and hidden-page lifecycle checks.

[Before/after evidence, references and performance measurements](LAYERING_CHECKPOINT.md): 1440x900, 1920x1080, 390x844, identical measured shell/panel bounds, no overflow. Added resources: 160 B JS + 794 B CSS gzip estimate; no new dependencies. Local 120-frame samples: median 16.7ms / maximum p95 16.8ms before and after, zero intervals above 34ms. Hardware-specific GPU/mobile and full LCP/input-latency benchmarks were not performed. Hidden visibility event is simulated for deterministic headless testing. No live provider calls, push or deployment.

## Design finish validation - September 19, 2026

Production preview: http://127.0.0.1:3025 (`CORTEX_BUILD_DIR=.next/design-finish`), branch `feat/finish-product-design`, based on `30aec66`.

| Existing command | Final result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run lint` | Passed |
| `npm.cmd test` | 11 passed, 0 failed |
| `npm.cmd run build` | Passed; existing routes built |
| `npm.cmd run test:e2e` | 13 passed, 0 failed in the complete final run |

Browser zoom was reset to 100%; measured CSS zoom and viewport scale are 1. Computed desktop sizes: sidebar 224px, top bar 60px, workspace insets 36px vertical / 40px horizontal, page heading 32px, primary mission heading 28px, task title 15px. Working content reaches 1280px at wide desktop.

Actual Chromium screens inspected at 1440x900, 1920x1080 and 390x844; 1280x900 overflow checks also pass. Axe WCAG 2 A/AA and 2.1 AA assertions report zero violations in tested desktop/mobile entry, overview, mission detail, missions, settings, roster, agent sheet and voice-error states. Existing interaction/accessibility assertions remain. Agent inspector selectors accommodate the intended aside/dialog semantics; added a mobile modal focus-loop check.

One implementation pass and one browser correction pass. The correction fixed mobile inspector Tab containment and agent runtime-column spacing; final review-dialog copy removes internal phase terminology. Preserved objective validation/submission, persistence, task controls, category filters, search/empty results, inspector Escape/focus return, reduced motion, review flow and the reviewed voice draft.

| Final screen | Desktop 1440 | Wide 1920 | Mobile 390 |
| --- | --- | --- | --- |
| Overview | [Screenshot](screenshots/finish/overview-desktop.png) | [Screenshot](screenshots/finish/overview-1920.png) | [Screenshot](screenshots/finish/overview-mobile.png) |
| Missions | [Screenshot](screenshots/finish/missions-desktop.png) | [Screenshot](screenshots/finish/missions-1920.png) | [Screenshot](screenshots/finish/missions-mobile.png) |
| Agents | [Screenshot](screenshots/finish/agents-desktop.png) | [Screenshot](screenshots/finish/agents-1920.png) | [Screenshot](screenshots/finish/agents-mobile.png) |
| Agent details | [Screenshot](screenshots/finish/agent-detail-desktop.png) | - | [Screenshot](screenshots/finish/agent-detail-mobile.png) |

Limits: live ElevenLabs conversation and live backend execution were not exercised. Browser voice tests mock session responses and use synthetic microphone denial; the reviewed draft flow remains covered. No fake missions, artifacts, verification, grants or execution were added. No backend/security/API, credentials or dependency changes. The pre-existing local `next-env.d.ts` change is preserved and excluded from the checkpoint. No connection pass or deployment.

## Product UI reset validation - September 19, 2026

Production preview: http://127.0.0.1:3024 (`CORTEX_BUILD_DIR=.next/ui-reset`).

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: 11 passed, 0 failed.
- `npm.cmd run build`: passed; all existing routes built.
- `npm.cmd run test:e2e`: final full run passed 12 of 13; remaining failure was a test locator selecting the hidden objective dialog instead of the visible objective. Corrected the locator and ran `npm.cmd run test:e2e -- --grep 'objective validation'`: 1 passed. All 13 browser cases pass across those runs.
- Browser: Playwright Chromium 153.0.8010.12. Initially missing browser executable; installed the version required by the existing package, with no dependency/lockfile changes.
- Viewports: 1440x900, 390x844, and wide/compact checks at 1920x900 and 1280x900.
- Axe WCAG 2 A/AA and 2.1 AA checks: zero violations on entry, overview, mission detail, missions, settings, roster, agent drawer, and voice error dialog at desktop/mobile.
- Behavioral coverage: objective validation, keyboard submission, duplicate submission, persistence, unsent draft retention through voice fallback, navigation, all seven agent categories, search/empty results, preview identity/authority, inspector focus return/Escape, pause/resume, review dialog, reduced motion, Canvas absence, voice authorization failure and microphone denial.
- One implementation pass and one browser correction pass. Corrected mobile top-bar overflow, task separator encoding, and the drawer's initially transparent content. Final screenshot set inspected; no additional redesign round.

Screenshots: [entry desktop](screenshots/reset/entry-desktop.png), [entry mobile](screenshots/reset/entry-mobile.png), [overview desktop](screenshots/reset/overview-desktop.png), [overview mobile](screenshots/reset/overview-mobile.png), [agents desktop](screenshots/reset/agents-desktop.png), [agents mobile](screenshots/reset/agents-mobile.png), [drawer desktop](screenshots/reset/agent-detail-desktop.png), [drawer mobile](screenshots/reset/agent-detail-mobile.png), [mission detail](screenshots/reset/mission-detail-desktop.png), [missing mission](screenshots/reset/missing-mission.png), [empty search](screenshots/reset/empty-search.png), [validation error](screenshots/reset/objective-error.png).

Limits: live ElevenLabs conversation and live backend execution were not exercised. Browser voice tests mock session responses and never contact the paid provider; microphone denial is synthetic. The reviewed draft tool remains unit-tested. The existing demo adapter always seeds one mission; zero-mission rendering is defensive and was not reached through its public API. No fabricated history or artifacts were added. No connection pass, deployment, push, environment changes, or backend/security edits.

# Phase A visual-refinement verification

## Voice and category extension / September 19

- PASS: typecheck, lint, all 11 unit tests, production build (`.next/voice-final`).
- PASS: all 13 browser checks against `http://127.0.0.1:3023`. The complete run
  passed 12; the combined homepage/FIELD screenshot workflow timed out under host
  load. After stopping three older agent-owned QA servers, that workflow passed
  separately in 24.8 seconds. Its multi-viewport/axe workflow now has a two-minute
  total budget; individual assertions remain unchanged apart from the new voice
  readiness wording. Traces: `%TEMP%/cortex-voice-final` and
  `%TEMP%/cortex-voice-workflow-clean`.
- PASS: actual ElevenLabs SDK loads in the browser and reports denied microphone
  permission without contacting the provider. Server tests verify missing config,
  invitation and origin checks, secret containment, malformed/upstream errors.
  Client tests verify draft validation, preservation of a draft under review,
  mute/end, and closing a session that completes after cancellation.
- PASS: category filters, rejected voice access, text fallback, focus return,
  mobile overflow and desktop/mobile axe checks (zero violations in tested states).
- No real voice call or live worker execution was tested: local ElevenLabs values
  were empty and P1's live adapter is still pending. No microphone audio was captured.

Final home/map screenshots: `screenshots/reduction/voice-final-*.png`, compared with
`qa-final-*.png`; homepage hierarchy and the default neural-map composition remain
unchanged. Voice and category screenshots: `screenshots/voice/`. Files named
`configured-preview-*` use mocked readiness solely to inspect the configured form;
they do not show a live connection. `dialog-*` captures the rejected-access state.
See [setup and handoff](VOICE_HANDOFF.md).

## Final visual QA

PASS: typecheck, lint, all 6 unit tests, production build and all 10 browser tests (one sequential run, 1.6 minutes). Production QA uses `http://127.0.0.1:3021` with `CORTEX_BUILD_DIR=.next/final-visual-qa`; traces are outside OneDrive at `%TEMP%/cortex-final-visual-qa`. Tested desktop/mobile axe states have zero violations. Added assertions verify Reset is absent initially and after reset, keyboard focus remains on the view controls, and branch focus is absent in list mode. [Final screenshots and audit](FINAL_VISUAL_QA.md).

Environment: Windows PowerShell, Node 24.20.0, npm 11.19.0, Next.js 16.3.5, React 19.3.0. Browser: Playwright Chromium / Chrome for Testing 153.0.8010.12, headless. These checks do not establish physical-device performance.

## Design reduction / current verification

Production QA on `http://127.0.0.1:3020`, built with `CORTEX_BUILD_DIR=.next/reduction-verified`. Before/after captures and reference lessons are linked from [DESIGN_REDUCTION.md](DESIGN_REDUCTION.md).

- PASS: typecheck, lint, all 6 unit tests and production build.
- PASS: all 10 browser tests in one final sequential run (1.6 minutes). The final run stores traces outside OneDrive via `--output C:\Users\rohee\AppData\Local\Temp\cortex-reduction-final-qa`.
- PASS: desktop/mobile WCAG 2 A/AA and 2.1 AA checks with zero axe violations in tested states; responsive overflow checks at 390, 1280, 1440 and 1920 pixels.
- PASS: objective validation, examples disclosure, duplicate-submit protection, keyboard submission, new-mission dialog, persisted missions, review/voice dialogs, map/list, search/filter, inspector open/close/Escape/focus return and handoff selection.
- PASS: Canvas pixels change during ambient motion, freeze with visual pause/reduced motion, and execution packets follow mission state. SVG/DOM fallback remains usable with Canvas unavailable. No external requests or bitmap assets were introduced.

An initial axe failure found `aria-controls` referring to the unmounted inspector; references now exist only when their target is mounted. Intermediate test artifacts collided; the final isolated sequential run above is the authoritative result. Generated build-path changes were removed from tsconfig and the pre-existing local `next-env.d.ts` dev imports restored.

## Agents extension / previous verification

Production QA on `http://127.0.0.1:3018`, built with `CORTEX_BUILD_DIR=.next/agents-final`. New screenshots are in `docs/screenshots/agents/`.

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS, including after restoring the original local generated-file configuration |
| `npm.cmd run lint` | PASS |
| `npm.cmd test` | PASS, all 6 unit tests |
| `npm.cmd run build` | PASS, `/agents` statically generated |
| `npm.cmd run test:e2e` | PASS, all 9 tests, 1.9 minutes against the final production build |
| Agents desktop/mobile axe checks | PASS, zero WCAG 2 A/AA and 2.1 AA violations in the tested states |
| Canvas motion and pause | Pixel content changes while fluid; identical across multiple frame ticks when paused |
| Mission pause versus visual pause | Mission pause removes executing packets and changes executing count to zero; atmosphere continues. Visual pause freezes animation without changing mission state |
| Agent selection and discovery | Search, empty results, review filter, map/list, reset, branch focus and inspector updates passed |
| Disconnected previews | Memory shows unverified identity, zero scoped permissions and no mission; no runtime is created |
| Mobile and fallback | Roster, inspector keyboard focus, contained horizontal map, navigation and no-Canvas/reduced-motion states passed |
| Runtime requests | No external requests in the tested Agents interaction flow; reference PNG is not a runtime asset |

Inspected screenshots: 1440×900, 1920×1080, 1280×900, 390×844 and mobile full-page captures. The refined inspector scrolls independently on desktop; mobile retains natural page scrolling. A motion recording demonstrates actual node selection, focus, visual pause and resume.

Initial verification found a filter test selector mismatch: the implicit select label included option text in the label query. The control now has an explicit accessible label and the test selects it by combobox role. An earlier combined test timed out at that selector; all final tests pass. The older `.next/visual-review` output hit a Windows/OneDrive EPERM lock, so final QA used fresh isolated output. Existing environment values and original local generated-file imports were restored/preserved.

Limits: this establishes demo behavior and selected Chromium accessibility states. It does not establish live ANS verification, provider execution, microphone behavior, Safari/Firefox support, physical-mobile battery usage or a hardware frame-rate guarantee. Existing Entry/FIELD tests also passed; their previous review images remain as historical artifacts.

## Commands actually run - previous living-field pass
| Check | Result |
| --- | --- |
| npm.cmd run typecheck | PASS after final changes |
| npm.cmd run lint | PASS, no warnings after final changes |
| npm.cmd test | PASS, 6 tests; fixture/API semantics unchanged |
| npm.cmd run build | PASS with CORTEX_BUILD_DIR=.next/visual-review |
| npx.cmd playwright test e2e/living-field.spec.ts on dev | PASS, 2 tests, 7.9s |
| npm.cmd run test:e2e on production port 3001 | PASS, 5 tests, 46.7s |

The normal production cache contained a read-only OneDrive reparse directory and failed with EPERM. It was preserved; production validation used the optional isolated output override. Next generated type includes for that directory. Keep the same override when running `next start` for this build.

The first production run exposed dynamic reduced-motion subscription and hydration-label failures. Replaced the preference hook with a server-safe useSyncExternalStore media-query subscription. The final full production run passed with zero page errors.

## New motion coverage
- Canvas pixels actually change during ambient motion, freeze under visual pause, and change again on resume.
- OS reduced-motion changes while the page is open immediately stop Canvas; pointer motion does not change the still scene.
- Execution packets disappear when the mission pauses; reduced-motion disables their CSS animation.
- Simulated unavailable Canvas context preserves the composer, SVG fallback and selectable inspector.
- Runtime asset guard now asserts zero `/assets/` bitmap requests. No source/reference PNG or former optical WebP is loaded.
- Fresh production screenshots: Entry/FIELD at 1440x900 and 390x844 (viewport and full-page mobile); a recorded WebM includes continuous Entry motion, Sage/Forge selection, inspector changes and mission pause. Time-separated Entry frames at 0/3/6 seconds were inspected.

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
- axe WCAG 2 A/AA and WCAG 2.1 AA checks: desktop Entry, desktop FIELD, mobile Entry and mobile FIELD all returned zero violations in the final production run. This is automated coverage, not a full accessibility certification.

## Added refinement guard test
The third browser test covers selected-agent semantics, a task-derived NOW/HOLD readout, removal of running signatures and heartbeat when paused, reduced-motion behavior for all three execution indicators, and focus/viewport access to the mobile inspector. Asset assertions now prohibit every runtime bitmap material request; the former optimized files remain archival. No new unit tests were added because contracts/reducer semantics did not change.

## Visual QA - current and prior passes
Current pass: inspected both real-prefixed references and Shadergradient direction. Reviewed `living-pass1`, then refined concentrated gold ridges, softened node halos, and made the motion control immediately reachable. Inspected `living-pass2`, mobile viewport/full-page layouts, and time-separated motion frames. Final production captures are at the screenshot root.

Re-inspected all four supplied boards, then captured Entry/FIELD at 1440×900 and 390×844 for the refinement. Reviewed the first pass visually and made a second pass: enlarged the selected coordinator, separated Forge's review marker from its status, improved mobile state-label readability, adjusted the mobile optical crop, and paused off-screen animation. The original Phase A's keyboard-scroll/focus fixes remain intact. The current procedural material contains no UI or text; all operational controls remain real DOM/SVG.

Screenshots live in `docs/screenshots/`; desktop entry and FIELD are exactly 1440×900, mobile runs use a 390×844 viewport with full-page captures as well. `phase-a-initial/` preserves the previous foundation; `refinement-pass1/` and `refinement-pass2/` preserve both review iterations. Additional 1280×800 and 1920×1080 captures are produced by the browser layout check. Reference PNGs are not requested by the running application. Final screenshots are captured from the optimized production build.

## Environment hygiene
Verified `.env.example` contains 41 names with no populated values. `.env.local` contains all 41 required names; existing values were not printed or overwritten. Provider secrets have no NEXT_PUBLIC prefix. No provider SDK, paid call, microphone session or deployment was initiated.

## Not tested / not implemented
Full Phase B scenario and failure branches; real ANS, Gemini, ElevenLabs, runtime, auth and policy gateway; durable storage; SSE reconnect/out-of-order replay; Safari/Firefox; real screen readers; physical mobile devices; formal contrast review of every decorative detail; performance traces, FPS and long-task measurements. No live integration is marked PASS.
