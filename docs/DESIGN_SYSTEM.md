> **Motion correction:** The owner explicitly requests visible movement, including mobile. The pearl/mauve field now travels, turns and changes proportions over 12 seconds each direction on desktop / 16 seconds on mobile. This supersedes older static-mobile and 48-second guidance below. Reduced motion stays static; hidden tabs pause. Product surfaces and text remain fixed.

> **Latest atmosphere refinement:** The owner supplied a ShaderGradient waterPlane preset using pearl `#f5f9ff`, muted mauve `#e4bce8` and black. Interpret it as one broad diagonal light field with a dark trough, no grain, no axes/helpers, and slow 48-second alternate transform/opacity motion. Keep the existing CSS renderer, static mobile/reduced-motion treatment, hidden-page pause and opaque product surfaces. Layout, typography and application behavior stay approved and unchanged. See `docs/WATERLIGHT_CHECKPOINT.md` for the implementation and evidence.

> **Active layering checkpoint (2026-09-19):** The owner approved the design-finish information architecture, type scale, spacing and interaction model. `CORTEXAI_LAYERING_ATMOSPHERE.md` now authorizes one quiet ambient light field and restrained surface depth. Preserve all geometry. The shared CSS environment sits behind opaque content, moves only transform/opacity over 48 seconds each direction, freezes on hidden pages and becomes static on mobile/coarse pointers and reduced motion. Material gradients, inner highlights and shallow shadows distinguish base, mission, decision and inspector surfaces. No WebGL dependency, particles, blur, neon, decorative relationship lines or additional UI controls. This supersedes older blanket prohibitions on background atmosphere. No connection pass or deployment.

> **Active design finish (2026-09-19):** `CORTEXAI_DESIGN_FINISH.md` refines the reset without changing information architecture. Geist; 224px sidebar; 60px top bar; 32-40px workspace insets; up to 1280px working content. Page/mission headings 32/28px, essential body and row text 14-16px, metadata 12-13px. Graphite surfaces (#0B0D10, #101216, #14171C, #1B1F26), warm-white actions, restrained #8FA8FF selection/focus, hairline borders, subtle shadows and 12px panels. Overview combines mission/tasks in a roughly 2:1 split with context; Missions uses aligned compact rows; Agents uses tonal role glyphs and a desktop side inspector or accessible modal sheet. Preserve actual state, honest preview labels, keyboard/mobile behavior and the reviewed voice draft. No new redesign, atmosphere, connection pass or deployment. Historical guidance below is superseded.

> **Active owner reset (2026-09-19):** `CORTEXAI_VISUAL_RESET.md` supersedes the historical visuals below. Geist, graphite, warm-white actions, restrained blue selection, one sidebar/top bar, task-first Overview and roster-first Agents. No mounted atmosphere, neural wallpaper, decorative orbits, glow, oversized serif type or perpetual motion. Identity, standing, authority and runtime stay separate. Stop at visual review; do not start the connection pass or deploy.

# CORTEXAI / Design foundation

Phase A visual refinement plus the explicitly requested Agents frontend extension. Visual approval: pending Roheen's review. `/agents` is now available; adapters, shared fixtures, contracts and integration boundaries are unchanged.

## Agents / constellation extension

`references/agentimage.png` is the direct art-direction target: left editorial title and mission counts, a central orchestrator with five surrounding colored clusters, a separate Guardian boundary, an inspector on the right, and recorded mission activity along the bottom. The image is reference material only and is never loaded by the running page.

`src/components/agents/` contains the reusable field atmosphere, node glyphs, connection paths, state-driven signal pulse, inspector, field controls, and presentation-only coordinates. `src/styles/agents.css` scopes the composition to this route and its shell. Research is sage green, analysis pale blue, execution amber, memory muted violet, and voice soft coral. The orchestrator stays ivory/gold. Text and buttons are DOM elements; lines and symbols are SVG; the original optical fabric is Canvas 2D.

The five mission agents retain existing API state. Memory and Voice are disconnected, unverified concept previews with no permissions or assignment; they are not added to the roster. Counts, execution packets, mission pause, selection and activity use the shared ControlApi snapshot. Guardian remains an independent boundary. Capability satellites and shifting fabric are decorative presence, never extra workers or fabricated transfers.

Ambient animation uses the existing shared frame clock, at its 30fps cap, with DPR capped at 1.4 and fewer strands on narrow canvases. No React state is changed per frame. Canvas and CSS/SVG honor visual pause, reduced motion, hidden tabs and off-screen suspension. SVG links and controls survive unavailable Canvas. The inspector has its own scroll area on desktop. Below 761px, the roster is primary and selection moves focus to the inspector; the map remains an optional horizontally scrollable surface. Search, status filters, map/list, reset, branch focus and mission pause are real controls.

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
