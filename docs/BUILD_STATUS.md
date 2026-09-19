## Current: visible atmosphere motion

Owner correction implemented: 12-second desktop / 16-second mobile sweeps, visibly traveling and changing proportions. Reduced motion and hidden-page pause preserved. Preview: http://127.0.0.1:3027/missions. [Motion clips and validation](WATERLIGHT_CHECKPOINT.md).

## Current checkpoint: pearl / mauve atmosphere refinement

The owner's supplied ShaderGradient waterPlane preset is adapted into the existing CSS background, preserving all approved product geometry. Branch `feat/pearl-waterlight`, based on `51a6f60`. Local preview: http://127.0.0.1:3027/field. See [checkpoint](WATERLIGHT_CHECKPOINT.md). No dependency, backend, contract or credential changes; no deployment.

## Current checkpoint: layering and atmosphere ready for review

Implemented on `feat/layering-atmosphere` from `98d924a`. The approved design-finish composition is preserved; one shared CSS light field and restrained surface material provide depth. Local production preview: http://127.0.0.1:3026 (`CORTEX_BUILD_DIR=.next/layering`). See [layering evidence and before/after comparisons](LAYERING_CHECKPOINT.md). No dependencies, backend/API/security, credentials or mission behavior changed. No push, deployment or connection pass.

> **Active layering checkpoint (2026-09-19):** The owner approved the design-finish information architecture, type scale, spacing and interaction model. `CORTEXAI_LAYERING_ATMOSPHERE.md` now authorizes one quiet ambient light field and restrained surface depth. Preserve all geometry. The shared CSS environment sits behind opaque content, moves only transform/opacity over 48 seconds each direction, freezes on hidden pages and becomes static on mobile/coarse pointers and reduced motion. Material gradients, inner highlights and shallow shadows distinguish base, mission, decision and inspector surfaces. No WebGL dependency, particles, blur, neon, decorative relationship lines or additional UI controls. This supersedes older blanket prohibitions on background atmosphere. No connection pass or deployment.

## Current checkpoint: design finish ready for owner review

Implemented on `feat/finish-product-design` from reset commit `30aec66`. The existing information architecture now has stronger type hierarchy, deliberate graphite surfaces, a composed Overview, aligned mission rows and tonal agent identities. The desktop inspector sits beside the roster; smaller screens use a focus-contained modal sheet. Existing routes, mission behavior, search/categories, identity/standing/authority/runtime distinctions and reviewed voice drafts are preserved.

Local production preview: http://127.0.0.1:3025 (`CORTEX_BUILD_DIR=.next/design-finish`). Typecheck, lint, 11 unit tests, production build and all 13 browser tests pass. See [test evidence](TEST_RESULTS.md) and [final screenshots](screenshots/finish/). One implementation pass and one browser correction pass; corrected inspector keyboard containment and status-column spacing. No backend, API, security, environment or dependency changes; no connection pass, push or deployment. Owner visual approval remains pending.

> **Active design finish (2026-09-19):** `CORTEXAI_DESIGN_FINISH.md` refines the reset without changing information architecture. Geist; 224px sidebar; 60px top bar; 32-40px workspace insets; up to 1280px working content. Page/mission headings 32/28px, essential body and row text 14-16px, metadata 12-13px. Graphite surfaces (#0B0D10, #101216, #14171C, #1B1F26), warm-white actions, restrained #8FA8FF selection/focus, hairline borders, subtle shadows and 12px panels. Overview combines mission/tasks in a roughly 2:1 split with context; Missions uses aligned compact rows; Agents uses tonal role glyphs and a desktop side inspector or accessible modal sheet. Preserve actual state, honest preview labels, keyboard/mobile behavior and the reviewed voice draft. No new redesign, atmosphere, connection pass or deployment. Historical guidance below is superseded.

## Current checkpoint: product UI reset ready for owner review

Implemented on `feat/product-ui-reset` from `986ec5f`. See [checkpoint](UI_RESET_CHECKPOINT.md) and [test evidence](TEST_RESULTS.md). Local production preview: http://127.0.0.1:3024. Graphite/Geist presentation replaces the rejected atmosphere and orbital composition. All existing routes and demo/voice boundaries are preserved. No connection pass or deployment.

> **Active owner reset (2026-09-19):** `CORTEXAI_VISUAL_RESET.md` supersedes the historical visuals below. Geist, graphite, warm-white actions, restrained blue selection, one sidebar/top bar, task-first Overview and roster-first Agents. No mounted atmosphere, neural wallpaper, decorative orbits, glow, oversized serif type or perpetual motion. Identity, standing, authority and runtime stay separate. Stop at visual review; do not start the connection pass or deploy.

# CORTEXAI / Phase A living visual checkpoint

## Owner-authorized voice and category extension

The design reduction and final QA were published to `main` in `52d6b97`, merging
all four newer teammate commits through `c4f9bf9` without conflicts or force-pushing.
Vercel confirmed that exact commit's production deployment; the public site is
[cortex-gray-tau.vercel.app](https://cortex-gray-tau.vercel.app).

The next frontend addition supplies seven category filters inside Find agents and
a voice assistant with a reviewed, editable mission handoff. Session tokens are
issued server-side behind a private team access code. Empty configuration remains
usable with text and does not request a microphone. Settings distinguishes
configuration from a tested connection. See [voice setup and integration boundary](VOICE_HANDOFF.md).

P1's provider/adapter, P3's API, P4's ANS/environment files, P5's agents, shared
contracts, the CORTEXAI rename, and `docs/status.md` were preserved. The new composer
handoff uses the existing ControlApi and currently creates demo missions; real hub
execution still depends on the team's live adapter. No live ElevenLabs call is claimed.

Verified on `http://127.0.0.1:3023`: typecheck, lint, 11 unit tests, production build
and all 13 browser checks. One host-load timeout passed on an isolated rerun after
older QA servers were stopped. See [full test evidence](TEST_RESULTS.md).

## Final visual QA / complete

The no-redesign audit is complete. Homepage composition and neural rendering are unchanged. Removed duplicate workspace demo labels and repetitive roster capability text, made Reset and branch focus contextual, and tightened desktop roster spacing. CORTEXAI branding and backend work are untouched. Typecheck, lint, 6 unit tests, production build and all 10 browser tests pass; tested desktop/mobile axe states report zero violations. [Final comparison and stop point](FINAL_VISUAL_QA.md).

Historical verified preview: `http://127.0.0.1:3021`, built with `CORTEX_BUILD_DIR=.next/final-visual-qa`. This checkpoint was subsequently published in `52d6b97` as described above.

## Current checkpoint / Design reduction

Completed the requested subtraction pass after directly inspecting Linear, APHELION, the local homepage and the GitHub-linked deployment. Incorporated teammate commit `1c5cec1` first, preserving the CORTEXAI rename and backend work. See [the design audit and comparison](DESIGN_REDUCTION.md).

The homepage now contains the wordmark, concise promise, objective composer and one procedural field. Deleted the side notes, specimen, metadata, duplicate topology, principles and footer philosophy, plus their unused styles. Examples are available through a disclosure. The workspace sidebar contains working destinations; redundant artwork and future-section placeholders are gone.

Agents opens with the network occupying the whole stage. Selection opens a closable inspector; search/filter and recorded activity use disclosures. Actual runtime/review/disconnected states, scope evidence, handoffs, mission actions, roster mode and the shared motion architecture remain. Preview specialists still have no admission or authority. No contracts, providers, credentials or backend behavior changed.

Historical review build: `http://127.0.0.1:3020` with `CORTEX_BUILD_DIR=.next/reduction-verified`. This pass was subsequently included in the owner-authorized publication described above.

Validation: typecheck, lint, all 6 unit tests, production build and all 10 browser tests passed. Final desktop/mobile axe checks report zero violations. See [verification details](TEST_RESULTS.md).

## Previous checkpoint / Agents constellation

The owner's explicit Agents request extends the frontend with `/agents`, using `references/agentimage.png` as the direct visual target. The new page is linked from the workspace sidebar and Entry navigation. Broader Phase B work still awaits direction.

- Real React controls and readable DOM labels over an original Canvas/SVG constellation: orchestrator, five colored specialist clusters, separate Guardian boundary, right inspector and recorded activity strip.
- Continuous optical fabric, breathing signatures, rotating rings, light grains, hover response, selected-branch focus and Framer Motion inspector transitions. Shared frame clock, reduced motion, visual pause and Canvas fallback are preserved.
- Search by name/role/capability, mission/review filters, map/list, reset, selectable nodes and handoffs, expandable identity evidence, mission navigation and pause/resume all work.
- Mission counts, statuses, active packets and events come from the existing ControlApi snapshot. Memory and Voice are disconnected, unverified concept previews with no authority or mission assignment. No new shared contract or roster entry was introduced.
- Mobile defaults to the roster; selection scrolls and moves keyboard focus to the inspector. The map is an optional horizontally scrollable view.

Validation: typecheck, lint, all 6 unit tests, production build and all 9 browser tests passed. Agents accessibility checks found zero axe violations on desktop and mobile. Browser coverage includes real changing Canvas pixels, frozen pixels during visual pause, paused mission counts/packets, filtering, preview authority, mobile navigation and unavailable Canvas. See `docs/TEST_RESULTS.md` for limits.

Preview: `http://127.0.0.1:3018/agents`. The verified build uses `CORTEX_BUILD_DIR=.next/agents-final` because OneDrive locked the older output. To reproduce: set that process environment variable, run `npm.cmd run build`, then `npm.cmd run start -- --port 3018`. Normal development remains `npm.cmd run dev`. Existing environment files and the pre-existing `next-env.d.ts` development imports were preserved.

Review artifacts: [desktop](screenshots/agents/desktop.png), [wide](screenshots/agents/wide.png), [compact desktop](screenshots/agents/compact.png), [mobile](screenshots/agents/mobile.png), [mobile inspector](screenshots/agents/mobile-inspector.png), [motion recording](screenshots/agents/motion.webm). Re-record with `node scripts/capture-agents.mjs` against the local preview. The reference image itself is never loaded by the runtime.

Changed product files: `src/app/(workspace)/agents/page.tsx`, the three modules under `src/components/agents/`, `src/styles/agents.css`, `src/components/shell.tsx`, `src/components/entry.tsx`. Added browser coverage and capture script; updated the visual handoff docs. No dependencies, lockfiles, backend services, provider setup or microphone capture changed. The exact next step is Roheen's visual review of this Agents composition.

## Previous checkpoint / Entry and FIELD

September 18, 2026. Phase A visual refinement completed through two screenshot inspection passes. Awaiting Roheen's visual review. Do not start Phase B or live integration without the next instruction.

## Current living-field refinement

**PHASE A VISUAL FOUNDATION READY FOR ROHEEN APPROVAL: YES** - review readiness, not a claim of owner approval.

- Replaced runtime optical bitmaps with original procedural Canvas ribbons, fluid deformation, soft luminous ridges, gold/cyan volumes, surface grains and eased pointer/scroll parallax.
- Added presence breathing, selected halos, running-only signal packets, hover/focus relation emphasis and Framer Motion inspector transitions. Existing task semantics and independent Guardian boundary remain intact.
- Added a top-bar FLUID/STILL control, live OS reduced-motion subscription, hidden/off-screen suspension and Canvas-unavailable fallback. One shared frame scheduler; no React updates per frame.
- Reviewed both `realstarterpage.png` and `realcontrolcenter.png` alongside the original boards. First screenshot review led to brighter concentrated ridges, softer halos, and a top-bar motion control. Mobile remains an authored agent list with inspector access.
- No Phase B features, live provider calls, microphone capture, deployments or environment-value changes.

Validation: strict typecheck, lint, 6 unit tests, production build and all 5 production browser tests passed. Automated axe checks returned zero violations across desktop/mobile Entry and FIELD. See TEST_RESULTS.md for limits and the resolved motion-preference failures.

Current changed files: `src/components/living-field.tsx`, `motion-system.tsx`, `atmosphere.tsx`, `entry.tsx`, `network.tsx`, `field.tsx`, `shell.tsx`, `agent-signature.tsx`; `src/lib/visual/field-config.ts`, `frame-clock.ts`; `src/styles/living.css`, `utilities.css`, `refinement.css`; `src/app/layout.tsx`; `package.json`, `package-lock.json`, `postcss.config.mjs`, `next.config.ts`, `tsconfig.json`; `e2e/living-field.spec.ts`, `e2e/phase-a.spec.ts`; `scripts/capture-living-motion.mjs`; `AGENTS.md`, `PLAN.md`, `docs/DESIGN_SYSTEM.md`, `docs/TEST_RESULTS.md`, `docs/OPTICAL_ASSET.md`, this document and screenshot/video artifacts.

Motion review: `docs/screenshots/living-motion/cortexai-living-field.webm`. Current desktop/mobile screenshots remain in `docs/screenshots/`; inspected iterations are `living-pass1/` and `living-pass2/`.

Run development: `npm.cmd run dev`, open http://127.0.0.1:3000. For production QA in this OneDrive workspace: `$env:CORTEX_BUILD_DIR='.next/visual-review'; npm.cmd run build; npm.cmd run start -- --port 3001`. The optional output override preserves an older generated cache that Windows/OneDrive marked read-only. Use the same override for build/start. No environment file was modified.

Remaining: Roheen's visual approval; physical-mobile frame-rate/battery and Safari/Firefox checks. The long mobile field intentionally scrolls; selecting a node moves focus to its inspector. This is still an honest local demo.

## Previous optical refinement (historical)
**PHASE A VISUAL FOUNDATION READY FOR ROHEEN APPROVAL: YES**

- Entry: larger institutional title plate, asymmetric specimen and margin notes, original optical caustic material, precise composer corners, warmer restrained action emphasis and more deliberate whitespace.
- FIELD: distinct original agent signatures, larger selected coordinator aperture, stable curved execution paths, clear waiting boundary, active-process heartbeat and state-derived NOW/HOLD transmission.
- Mobile: authored optical crop, serif agent hierarchy, connected assignment list, separate Guardian boundary, larger state labels, automatic focus/scroll to the existing inspector.
- Motion: execution-only signal traces; one-shot selection/event arrival; pause/reduced-motion/hidden-tab/off-screen guards. No invented verification, task completion or fake live telemetry.
- Material: self-hosted optimized WebP (93,944 bytes desktop / 21,026 bytes mobile). Readable DOM surfaces sit above it. Source PNG is archival, not a runtime request.

First refinement captures are retained in `docs/screenshots/refinement-pass1/`; second-pass captures in `refinement-pass2/`; the original Phase A captures in `phase-a-initial/`. Final fresh captures remain at the top of `docs/screenshots/`. The four supplied reference boards were re-inspected directly. The first screenshot review led to a larger coordinator, separated Forge status/review marker, clearer mobile status type and a deliberate mobile material crop.

Files changed in this pass: `src/app/layout.tsx`; `src/components/agent-signature.tsx` (new), `atmosphere.tsx`, `entry.tsx`, `network.tsx`, `field.tsx`; `src/styles/tokens.css`, `refinement.css` (new); `public/assets/optical-field-source.png`, `optical-field.webp`, `optical-field-mobile.webp`; `scripts/capture-visual-review.mjs`, `scripts/optimize-optical-field.mjs`; `e2e/phase-a.spec.ts`; `ATTRIBUTIONS.md`; `docs/OPTICAL_ASSET.md`, `DESIGN_SYSTEM.md`, `TEST_RESULTS.md`, this file and screenshot artifacts. No routes, fixtures, contracts, environment values or provider integrations were added or changed.

## What works
- Procedural Canvas/SVG/CSS atmosphere, self-hosted typography, centralized design tokens and responsive shell.
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
- [Entry, 390×844 viewport](screenshots/entry-mobile-viewport.png) and [mobile inspector](screenshots/inspector-mobile.png)
- [Capability request preview](screenshots/review-desktop.png)
- [Wide desktop, 1920px](screenshots/field-1920.png) and [compact desktop, 1280px](screenshots/field-1280.png)

Verification: strict typecheck, lint, six unit tests, production build and three production browser tests passed after refinement. The production browser suite took 14.2 seconds; automated accessibility checks found zero violations across the four Entry/FIELD viewport states. See TEST_RESULTS.md for limits.

## Remaining issues / boundaries
No blocking visual issue found in the inspected Chromium desktop/mobile layouts. Final atmosphere intensity and fine annotation scale remain Roheen's subjective approval decisions. Safari/Firefox, physical devices, text-zoom and frame-time profiling still need broader validation; no hardware performance claim is made. The remaining product workflow is deliberately incomplete:

- Custom objectives share the same explicit sample plan; no real planning or automatic progression occurs.
- Recruitment is a pending request preview. Candidate discovery/admission, policy decisions and finished artifacts are Phase B work.
- Agents, Directory, Guardian, Voice and Events sidebar sections are visibly deferred, not fake links. Mission boards/search and command palette are also deferred.
- No stream ingestion/reconciliation, provider failure branches, real identity checks, authenticated policy enforcement, database persistence or microphone capture has been implemented.
- Accessibility checks cover selected states in Chromium; screen-reader, Safari/Firefox, physical-device, 200% text-size and performance profiling are not complete.
- Demo localStorage is device-local, not durable backend storage; the UI remains usable without storage.

No deployment, paid provider operation or external agent action was performed. The exact next step is Roheen's review of the entry and FIELD composition; then proceed to Phase B only after acceptance.
