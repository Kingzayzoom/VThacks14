CORTEXAI — LAYERING & ATMOSPHERE PASS

This is NOT another redesign.

The current information architecture, typography scale, layout, spacing,
navigation, roster-first Agents page, Overview composition, Missions page,
and interaction model are approved.

This task exists only to add DEPTH, ATMOSPHERE, AND VISUAL CRAFT
without returning to the rejected sci-fi / neural-spaghetti direction.

Before editing, study:

1. https://shadergradient.co/
2. https://www.getlayers.ai/
3. https://www.getlayers.ai/docs

ShaderGradient note:
shadergradient.com is no longer the active product site.
Use shadergradient.co / @shadergradient/react as the reference.

GetLayers note:
Use its library as design/craft reference.
Do not copy an entire template verbatim.
Do not violate licensing or download premium source unless already authorized.
If GetLayers MCP is already available, use it.
Otherwise browse the public/free layers and docs only.

────────────────────────────────────
DESIGN GOAL
────────────────────────────────────

CORTEXAI should feel:

- dimensional
- authored
- premium
- modern
- calm
- tactile
- subtly alive

It should NOT feel:

- flat
- like a generic admin dashboard
- like a component-library starter
- like a sci-fi HUD
- like an AI-generated “futuristic” website
- overloaded with gradients, glow, or motion

The product UI must remain readable and stable.

Think:

Linear-level product clarity
+
APHELION-level authored atmosphere
+
GetLayers-level depth/layering
+
one restrained ShaderGradient environment

NOT four competing visual systems.

────────────────────────────────────
1. CREATE A REAL LAYER SYSTEM
────────────────────────────────────

Introduce a deliberate visual stack:

LAYER 0 — APPLICATION BASE
- deep graphite background
- stable
- no motion

LAYER 1 — ATMOSPHERE
- one extremely subtle animated ShaderGradient or equivalent
- very low contrast
- large scale
- slow movement
- no bright rainbow color
- no obvious blobs
- should almost disappear behind content

LAYER 2 — STRUCTURAL DEPTH
- faint radial lighting
- occasional soft edge illumination
- subtle tonal separation between navigation, workspace, and panels
- restrained texture/grain only if it improves material quality

LAYER 3 — PRODUCT SURFACES
- actual cards, rows, inspector, mission surfaces
- crisp, readable, stable
- strong hierarchy

LAYER 4 — INTERACTION
- hover / focus / selection
- short, precise motion only

No layer should fight the layer above it.

────────────────────────────────────
2. SHADERGRADIENT
────────────────────────────────────

Evaluate @shadergradient/react for ONE ambient application background.

Do not install it automatically without checking:
- compatibility with the current Next.js / React versions
- bundle impact
- browser performance
- mobile behavior
- reduced-motion support

If the dependency cost is unreasonable, reproduce the visual principle
with lightweight CSS or the existing rendering stack instead.

If used:
- keep it behind the application
- pointer response should be extremely subtle
- motion should be slow
- use dark graphite / desaturated blue / warm neutral tones
- opacity should remain low enough that text and surfaces dominate
- never put a separate ShaderGradient inside every card

Target feeling:
light moving behind smoked glass,
not “look at this shader.”

Use one global shader environment,
not several unrelated gradients.

────────────────────────────────────
3. GETLAYERS — STUDY COMPOSITION, NOT JUST EFFECTS
────────────────────────────────────

Browse GetLayers by FEELING, not by industry.

Look specifically for examples demonstrating:
- dark editorial interfaces
- atmospheric depth
- soft WebGL gradients
- restrained light fields
- section layering
- subtle pointer motion
- sophisticated empty space
- background/foreground separation

Study how layers create:
- foreground
- middle ground
- background
- visual anchoring
- controlled contrast
- depth without excessive borders

Do NOT import:
- giant 3D objects
- decorative characters
- random particles
- flashy carousels
- cinematic scenes that compete with the application
- full template layouts that replace our existing product architecture

Extract principles and adapt them to CORTEXAI.

────────────────────────────────────
4. OVERVIEW
────────────────────────────────────

Keep the current 2:1 mission/context structure.

Improve depth:
- workspace background subtly separates from sidebar
- mission surface feels one level above the canvas
- contextual decision panel can sit one level higher
- task rows should feel integrated into the mission surface
- use very subtle ambient illumination around the current mission region

No full-width animated background fighting the content.

The user’s eye order remains:
1. Mission
2. Tasks
3. Current decision
4. Results

────────────────────────────────────
5. MISSIONS
────────────────────────────────────

Keep it clean.

Do not add visual effects because the page has empty space.

Instead:
- use subtle background atmosphere across the workspace
- stronger row hover/selection depth
- perhaps a barely visible gradient illumination near selected mission
- refined separators
- maintain calm

One mission must still look intentional.

────────────────────────────────────
6. AGENTS
────────────────────────────────────

Do not restore the old constellation.

Keep the roster-first interface.

This page can have slightly more visual character than Missions:
- very faint relationship lines behind the roster ONLY if derived from actual relationships
- subtle identity illumination on selected agent
- inspector may use one restrained layered visual around the agent identity
- role tiles can have nuanced tonal variation

The actual agent information must remain easier to read than the atmosphere.

If relationship visualization is shown:
- use 1px or subpixel lines
- low opacity
- short/local connections
- no giant glowing neural web
- no decorative lines unrelated to data

────────────────────────────────────
7. SURFACE MATERIAL
────────────────────────────────────

Improve material quality through layering instead of ornament.

Use:
- slightly different graphite levels
- fine hairline borders
- restrained inner highlights
- very soft shadows
- subtle local radial lighting
- careful spacing

Avoid:
- glassmorphism everywhere
- heavy blur
- glowing borders
- oversized drop shadows
- multiple nested cards
- neon cyan
- purple AI gradients

A surface should feel like precision hardware,
not a Discord theme.

────────────────────────────────────
8. MOTION
────────────────────────────────────

Background atmosphere:
slow continuous movement is acceptable.

Product UI:
keep motion event-driven and restrained.

Examples:
- 140ms hover
- 200ms inspector reveal
- subtle selected-row transition
- one soft lighting response when active mission changes

Never animate:
- body text
- entire cards floating endlessly
- buttons breathing
- tables drifting
- every icon spinning

Motion should improve perceived material and responsiveness.

────────────────────────────────────
9. PERFORMANCE
────────────────────────────────────

This is a hackathon product, not a graphics demo.

Target:
- smooth desktop
- usable integrated-GPU laptop
- sensible mobile behavior
- no large first-load regression

Pause or substantially simplify ambient rendering when:
- page is hidden
- prefers-reduced-motion is enabled
- mobile performance requires it

Never compromise input latency or content readability for atmosphere.

────────────────────────────────────
10. EXECUTION PROCESS
────────────────────────────────────

Before editing:
1. Capture current Overview / Missions / Agents screenshots.
2. Inspect current tokens and component styles.
3. Inspect ShaderGradient compatibility.
4. Browse GetLayers references.
5. Write a very short plan listing exactly which layers will be introduced.

Then implement.

Do not change the application architecture.
Do not change backend integration.
Do not change data contracts.
Do not touch credentials.
Do not replace the current information architecture.

Afterward capture the same screenshots.

Compare BEFORE vs AFTER specifically for:
- depth
- hierarchy
- readability
- product identity
- visual noise

If the new version becomes harder to read, revert the offending effect.

────────────────────────────────────
SUCCESS CRITERIA
────────────────────────────────────

The result should make someone think:

“This feels expensive.”

Not:

“They added a shader.”

The interface should look richer even though almost no additional
visible UI elements were added.

CORTEXAI remains a professional work application.
The atmosphere exists to support the product, not become the product.

Run:
- typecheck
- lint
- unit tests
- browser tests
- production build

Do not deploy automatically.

Show before/after screenshots and report:
- dependencies added
- performance impact
- exact GetLayers references used
- exact ShaderGradient treatment used
- anything intentionally rejected because it was too visually aggressive