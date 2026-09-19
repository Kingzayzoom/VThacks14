# Phase A visual-refinement verification

Environment: Windows PowerShell, Node 24.20.0, npm 11.19.0, Next.js 16.3.5, React 19.3.0. Browser: Playwright Chromium / Chrome for Testing 153.0.8010.12, headless. These checks do not establish physical-device performance.

## Agents extension / current verification

Production QA on `http://127.0.0.1:3018`, built with `PERIHELION_BUILD_DIR=.next/agents-final`. New screenshots are in `docs/screenshots/agents/`.

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
| npm.cmd run build | PASS with PERIHELION_BUILD_DIR=.next/visual-review |
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
