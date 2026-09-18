# PERIHELION / Design foundation

Phase A visual refinement, September 18, 2026. Visual approval: pending Roheen's review. Routes, adapters, fixtures and integration boundaries remain unchanged.

## Direction
An authored instrument: an editorial title plate, architectural work surfaces, off-axis contour sheets, and a network that exposes the state of work. The four supplied AI-generated boards inform composition, not product claims. No reference image is shipped as a UI background. Entry is expressive; FIELD is quieter and denser.

## Tokens
Canonical file: `src/styles/tokens.css`.

| Role | Value |
| --- | --- |
| Canvas / surface / raised | #050607 / #0C1012 / #141A1D |
| Primary / secondary / decorative metadata | #EFECE4 / #A6ADB3 / #768189 |
| Subtle / strong rules | rgba(220,230,235,.14) / .28 |
| Solar amber / warm energy | #FFB65B / #EB8A48 |
| Executing / complete | #83D9E8 / #71E2AF |
| Review / blocked | #E7B864 / #F17B78 |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64px |
| Panels / dialogs | 6px / 12px radius |
| Interaction / panel duration | 150ms / 220ms |
| Material ivory / brass | #E5DDCA / #C9AA76 |
| Optical rules | rgba(203,215,210,.08) |
| Acquisition / easing | 460ms / cubic-bezier(.16,1,.3,1) |

Amber marks selection and pending review. Cyan means executing in the labeled demo. Mint means a completed fixture task. Status includes an icon and text; identity and permission are separate fields. Counts derive from the active mission, not invented telemetry.

## Type
Cormorant Garamond 400/italic for the wordmark and editorial headings; Geist 400/500 for controls and prose; IBM Plex Mono 400 for short technical labels. Fontsource packages self-host every font. No font request is required during build or browser use; Georgia/Arial/Consolas provide fallbacks.

At 1440px the desktop wordmark is 120px, entry heading 53px, FIELD heading 42px. Mobile entry/FIELD headings are 47px/45px. Important entry text and controls are 13–15px; operational rows are 12–14px; short technical labels are smaller. Decorative indices are intentionally subordinate and never the sole source of task information. Mobile agent names use a 24px editorial serif with task and state labels below/beside them. Do not shrink mobile into a desktop graph.

## Six layers
0. Obsidian base and barely visible, slowly shifting grain.
1. Original procedural Canvas 2D ribbons and luminous volumes beneath mathematical SVG contour sheets. No runtime bitmap.
2. Sparse registration ticks, a specimen plate, sector/figure indices, and asymmetric margin annotations. These are editorial identifiers, not fabricated science measurements.
3. Opaque readable shell, task strip, and activity rail.
4. Stable agent positions, distinct geometric signatures, acquisition brackets, execution packets and an active-process heartbeat.
5. Event-keyed task transmission, state arrival, and native modal dialogs with focus restoration; mobile navigation with focus containment.

The z-index scale lives beside color tokens. Decorative Canvas/SVG is aria-hidden and pointer-inert. `LivingField` draws fluid optical ribbons, folded strands, narrow luminous ridges and surface-attached light grains. Existing generated WebP/PNG material is archived only; no raster background is requested. CSS radial fields and SVG contours survive Canvas failure.

## Living motion / current direction
The latest owner brief explicitly adds continuous, restrained ambient motion. It supersedes the original execution-only atmosphere rule. The four original boards and `references/realstarterpage.png` / `realcontrolcenter.png` inform composition. [Shadergradient](https://shadergradient.co/) informs gradual deformation and continuous motion, without importing its palette, assets, code or 3D engine.

- Atmosphere: four gently deforming ribbon bundles, low-frequency gold/cyan volumes, attached light grains, opacity variation, subtle grain and eased pointer/scroll depth.
- Presence: 8-second node breathing; 14-second coordinator aperture deformation. Presence does not mean task execution or verified identity.
- Execution: cyan packet on the actual running relation, running waveform and task-derived heartbeat. Mission pause removes packet travel and running states; ambient presence remains calm.
- Interaction: hover/focus highlights the corresponding relation and signature; selected brackets and a stronger halo identify focus. Framer Motion fades/translates inspector changes over 360ms. Surfaces receive subtle border/lift highlights.
- Accessibility: top-bar FLUID/STILL control pauses visual motion independently of the mission; OS reduced-motion changes apply immediately, including Canvas and pointer depth. Server-safe preference hydration avoids label mismatches. A still scene preserves structure.
- Performance: all visible canvases share one requestAnimationFrame scheduler, capped at 30 draws/second; DPR capped at 1.4, fewer strands/grains on mobile; document-hidden and intersection guards unsubscribe canvases. Frames mutate Canvas, never React/mission state. No 3D library, image decode or external visual request.

Tune `src/lib/visual/field-config.ts`: speed, amplitude, density, glow, opacity, frame rate, DPR and parallax. CSS motion durations live in `src/styles/living.css`. Tailwind utilities are enabled without preflight so existing typography/layout remains stable. Motion remains an isolated presentation concern.

## Component grammar
- `Brand`, `ModeBadge`, `Status`, `AgentGlyph`: one consistent visual vocabulary, Lucide icon family.
- `AgentSignature`: original optical aperture with P monogram for the coordinator, compass rose for Scout, triangular signal trace for Sage, offset construction squares for Forge, and shield for Guardian. Shapes communicate identity without relying on color.
- `SignalField`, `ContourSheet`: independent reusable atmosphere with no random render values.
- `MissionComposer`: clear label, examples, validation, idempotent submit and explicit demo scope.
- `Shell`: 216px rail, 64px topbar, mission context, and command dock reserved in document flow.
- `Network`: Scout compass, Sage triangle, Forge square, abstract coordinator; Guardian sits on an independent boundary.
- `Field`: activity/inspector tabs, pending-request preview, task strip, measured task count.
- `Dialog`: native modal, Escape/backdrop dismissal, keyboard focus return.

At 1440×900 the primary FIELD composition fits the viewport. The 1920px layout expands its topology. Tablet stacks the activity rail. At 390px, a large-tap agent list replaces the graph; pending review is directly accessible from the heading and precedes the event stream. Mobile pages scroll naturally.

Execution edges move only while their task is running; completed and pending relationships remain settled. Ambient curves are atmospheric, not task paths. Event updates never invent progress, handoffs, verification or success. Motion can be paused without changing the mission.

## Refined layout rules
`src/styles/refinement.css` owns the established composition; `src/styles/living.css` layers current procedural material and motion after it. Tokens remain centralized. New control corners are 1–2px; dialogs use 5px. Keep optical detail away from the composer and prose; keep workspace material substantially dimmer than Entry.

Entry uses an institutional masthead, large title plate, a central readable composer and an asymmetric specimen/margin rail. The three principle summaries follow the first-screen composition instead of crowding the objective. FIELD keeps the existing shell and expands the significance of the graph through signatures, deliberate curved links, local contour structure and a task-derived NOW/HOLD strip.

At 390px the same signature vocabulary appears in a vertically connected delegation list. Guardian has a separate dashed boundary. Tapping a row activates the existing inspector, scrolls it into view and moves keyboard focus to its labeled region. Pending review remains directly accessible in the heading. The mobile field uses a smaller procedural line budget and a deliberately wider composition.

## Reference mapping
Original `references/ChatGPT Image Sep 18, 2026, 03_36_51 PM (1–4).png` maps, in order, to the four named `public/references/` boards. All four were visually inspected before implementation. The original files remain intact.

Browser QA and remaining limitations are recorded in TEST_RESULTS.md and BUILD_STATUS.md.
