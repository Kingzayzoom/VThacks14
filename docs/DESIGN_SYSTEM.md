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
0. Black base and static, low-opacity grain.
1. Original photographic optical-field material under mathematical SVG contour sheets; responsive WebP assets.
2. Sparse registration ticks, a specimen plate, sector/figure indices, and asymmetric margin annotations. These are editorial identifiers, not fabricated science measurements.
3. Opaque readable shell, task strip, and activity rail.
4. Stable agent positions, distinct geometric signatures, acquisition brackets, execution packets and an active-process heartbeat.
5. Event-keyed task transmission, state arrival, and native modal dialogs with focus restoration; mobile navigation with focus containment.

The z-index scale lives beside color tokens. Decorative SVG is `aria-hidden`, pointer-inert, and never carries essential text. No canvas/WebGL or reference screenshot is used in the UI. The new bitmap is text-free original material, generated with the built-in imagegen tool and optimized to 93,944 bytes desktop / 21,026 bytes mobile. Its archival PNG is never requested by the app. See OPTICAL_ASSET.md for its exact prompt and paths.

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

Only running edges and the running agent's trace animate. The active-process heartbeat exists only during demo execution. Pause settles these states; selection gets one acquisition transition and event changes get one transmission arrival. Verified identity stays a labeled fixture, with no fabricated verification scan. Reduced motion disables all animation; document visibility and a cleaned-up IntersectionObserver pause animation when hidden/off-screen. No animation drives React state or invents progress, handoffs, verification, microphone activity or event success.

## Refined layout rules
`src/styles/refinement.css`, loaded once after the original global stylesheet, owns this material/composition pass. Tokens remain centralized. New control corners are 1–2px; dialogs use 5px. Keep optical detail away from the composer and prose; keep workspace material substantially dimmer than Entry.

Entry uses an institutional masthead, large title plate, a central readable composer and an asymmetric specimen/margin rail. The three principle summaries follow the first-screen composition instead of crowding the objective. FIELD keeps the existing shell and expands the significance of the graph through signatures, deliberate curved links, local contour structure and a task-derived NOW/HOLD strip.

At 390px the same signature vocabulary appears in a vertically connected delegation list. Guardian has a separate dashed boundary. Tapping a row activates the existing inspector, scrolls it into view and moves keyboard focus to its labeled region. Pending review remains directly accessible in the heading. The mobile optical crop is authored independently from desktop.

## Reference mapping
Original `references/ChatGPT Image Sep 18, 2026, 03_36_51 PM (1–4).png` maps, in order, to the four named `public/references/` boards. All four were visually inspected before implementation. The original files remain intact.

Browser QA and remaining limitations are recorded in TEST_RESULTS.md and BUILD_STATUS.md.
