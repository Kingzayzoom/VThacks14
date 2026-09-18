# PERIHELION / Design foundation

Phase A, September 18, 2026. Visual approval: pending Roheen's review.

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

Amber marks selection and pending review. Cyan means executing in the labeled demo. Mint means a completed fixture task. Status includes an icon and text; identity and permission are separate fields. Counts derive from the active mission, not invented telemetry.

## Type
Cormorant Garamond 400/italic for the wordmark and editorial headings; Geist 400/500 for controls and prose; IBM Plex Mono 400 for short technical labels. Fontsource packages self-host every font. No font request is required during build or browser use; Georgia/Arial/Consolas provide fallbacks.

The desktop wordmark is 98px, entry heading 45px, FIELD heading 40px. Mobile headings are 38–43px. Important entry text and controls are 13–15px; operational rows are 12–14px; short technical labels are smaller. Decorative coordinates/indices are intentionally subordinate and never the sole source of task information. Do not shrink mobile into a desktop graph.

## Six layers
0. Black base and static, low-opacity grain.
1. Original SVG cool contour sheet and amber energy fold, generated as reusable React components.
2. Sparse registration ticks and editorial indices.
3. Opaque readable shell, task strip, and activity rail.
4. Stable agent positions, selection rings, and execution edges.
5. Native modal dialogs with focus restoration; mobile navigation with focus containment.

The z-index scale lives beside color tokens. Decorative SVG is `aria-hidden`, pointer-inert, and never carries essential text. No canvas/WebGL or raster boards are required.

## Component grammar
- `Brand`, `ModeBadge`, `Status`, `AgentGlyph`: one consistent visual vocabulary, Lucide icon family.
- `SignalField`, `ContourSheet`: independent reusable atmosphere with no random render values.
- `MissionComposer`: clear label, examples, validation, idempotent submit and explicit demo scope.
- `Shell`: 216px rail, 64px topbar, mission context, and command dock reserved in document flow.
- `Network`: Scout compass, Sage triangle, Forge square, abstract coordinator; Guardian sits on an independent boundary.
- `Field`: activity/inspector tabs, pending-request preview, task strip, measured task count.
- `Dialog`: native modal, Escape/backdrop dismissal, keyboard focus return.

At 1440×900 the primary FIELD composition fits the viewport. The 1920px layout expands its topology. Tablet stacks the activity rail. At 390px, a large-tap agent list replaces the graph; pending review is directly accessible from the heading and precedes the event stream. Mobile pages scroll naturally.

Only running edges animate; pause removes the moving edge state. Reduced motion disables animation, and document visibility pauses animation while hidden. No time-based demo progression exists in this checkpoint. No microphone activity is implied by decoration.

## Reference mapping
Original `references/ChatGPT Image Sep 18, 2026, 03_36_51 PM (1–4).png` maps, in order, to the four named `public/references/` boards. All four were visually inspected before implementation. The original files remain intact.

Browser QA and remaining limitations are recorded in TEST_RESULTS.md and BUILD_STATUS.md.
