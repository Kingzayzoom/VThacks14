CORTEXAI — FINISH THE DESIGN, DO NOT RESET THE PRODUCT AGAIN

The current screenshots show an overcorrection.

We removed the excessive neural effects, but the replacement is a generic
dark admin scaffold: tiny content, weak hierarchy, excessive unused space,
flat surfaces, and no distinctive product identity.

Keep the improved information architecture.
Replace the underdesigned presentation.

This brief supersedes previous instructions to make everything move,
and also supersedes any interpretation that “simple” means tiny text
and an almost empty black viewport.

THE TARGET
A sophisticated, contemporary work application with:
- confident typography
- intentionally composed layouts
- meaningful visual hierarchy
- subtle material depth
- distinctive but restrained agent identities
- precise, responsive interactions

Not:
- a sci-fi dashboard
- an unstyled settings page
- a generic component-library demo
- a wall of decorative cards

SCOPE AND RESOURCE LIMIT

Use the existing framework, installed fonts, components, and state.
No new rendering engine, shader library, charting system, or UI framework.
No new backend implementation in this pass.
Do not change API contracts or mission behavior.

Implement the Overview first as the design standard.
Then apply the SAME decisions to Missions and Agents.
One browser correction pass afterward. No endless aesthetic exploration.

1. CORRECT THE SCALE AND WORKSPACE GEOMETRY

First verify browser zoom is 100% and inspect actual computed CSS sizes.
Do not compensate for screenshot scaling by blindly enlarging everything.

At normal desktop sizes:
- Sidebar approximately 216–232 CSS pixels.
- Top bar approximately 56–60 CSS pixels.
- Main workspace inset approximately 32–40 CSS pixels.
- Working content can expand to approximately 1200–1280 CSS pixels.
- Do not center every route in a narrow article-width column.

Use flexible layouts, not fixed dimensions that cause overflow.

Typography targets:
- Main page headings: approximately 28–32px.
- Primary mission heading: approximately 24–28px.
- Important row titles and body text: 14–16px.
- Secondary metadata: 12–13px.
- Avoid tiny uppercase text for essential information.

Keep a readable line length for descriptions even when the workspace is wide.

Empty space must support grouping and focus.
It must not make the application look unfinished.

2. BUILD A COHERENT SURFACE SYSTEM

Use a restrained graphite palette with visible depth.

Suggested starting tokens:
- Application background: #0B0D10
- Sidebar: #101216
- Main surface: #14171C
- Raised or selected surface: #1B1F26
- Primary text: #F0F1F3
- Secondary text: #A3AAB5
- Signature accent: #8FA8FF
- Primary CTA: warm-white fill with dark text

Treat these as starting values; validate actual text and control contrast.

Use accent color sparingly:
selection, keyboard focus, active work, and one brand detail.

Keep semantic warning/error/success colors separate.

Use hairline borders and restrained shadows to distinguish surfaces.
No glowing outlines around every panel.
No full-page gradients.
No backdrop-blur layer on every component.

Use a consistent radius family:
roughly 6–8px for controls and 12–14px for larger surfaces.

3. GIVE CORTEXAI A SMALL, RECOGNIZABLE IDENTITY

Keep the existing CORTEXAI name.

Refine the small brand mark into a crisp, simple vector treatment,
rather than a generic letter inside a default rounded square.
Do not spend this task developing a logo collection.

Give agents consistent, purposeful identifiers:
a recognizable monogram or compact role glyph on a restrained tonal tile.

Do not generate elaborate avatars.
Do not assign an unrelated bright color to every row.
Make identity work in monochrome as well.

The coordination motif should be simple:
short connected segments or a compact dependency path.

Use that motif only where it explains actual task relationships.
No decorative connections running across the page.

4. OVERVIEW — COMPOSE A REAL WORKSPACE

Preserve mission selection, objective viewing, task interactions,
review requests, results, activity, and existing supported controls.

Improve the composition:
- Compact page heading and mission selector.
- Strong mission title and a concise objective summary.
- A well-proportioned primary task region.
- One contextual secondary region for the next decision or latest result.

At wide desktop sizes, use an intentional roughly two-thirds / one-third
split for primary work and contextual information.

Avoid one oversized generic summary card above a stack of unrelated sections.

Tasks should feel designed:
- Clearly aligned status icon, title, assigned agent, and trailing action.
- Consistent row height and spacing.
- Subtle hover and keyboard-selected backgrounds.
- Dependencies readable without a web of decorative lines.
- Progress derived from actual task state.

Make “Review request” visually easy to find when it is the next action.
Do not create duplicate warning cards in multiple places.

When results are empty, show one compact, useful empty state.
Do not reserve a giant empty panel for nonexistent output.

5. MISSIONS — SMALL DATA MUST STILL LOOK INTENTIONAL

Keep the mission list honest.

Create a considered list header, clear column alignment,
comfortable row spacing, and a well-designed selected/hover state.

The mission name should dominate its row.
Status, task count, and date should support it.

Keep “New mission” easy to locate without duplicating it everywhere.

With only one mission:
- Do not stretch the row into an enormous card.
- Do not add fake missions.
- Do not add decorative analytics.
- Keep the remaining page quiet and properly composed.

Replace developer-facing copy such as “arrives in Phase B” with a concise,
truthful user-facing availability message where needed.
Keep technical roadmap details in documentation or integration settings.

6. AGENTS — MAKE THE ROSTER FEEL LIKE A PRODUCT

Keep the roster-first approach, search, and existing category filters.

Improve:
- Agent identity tile and name treatment.
- Role/capability hierarchy.
- Assignment readability.
- Runtime status alignment.
- Hover, selection, and keyboard focus.
- Row rhythm and spacing.

Selecting an agent should open a polished detail panel.
At wide widths, it should sit naturally beside the roster.
At smaller widths, use an accessible drawer or sheet.

The inspector should have clear sections:
Identity / Standing / Authority / Current work.

Do not collapse these into a single green dot.
Do not invent verification, trust scores, assignments, or grant expiry.

Disconnected preview agents must remain visibly distinct from working agents.
Do not animate them as if they are executing.

Do not reintroduce the full-screen neural constellation.

7. MOTION — PRECISE, NOT PERPETUAL

Use existing motion tools only.

Examples:
- Row hover/focus response: approximately 120–160ms.
- Inspector opening: approximately 180–240ms.
- Status update: short crossfade or icon transition.
- Actual task completion: one restrained acknowledgement.
- Newly arriving result: a brief reveal.

Keep text and click targets stable.
No perpetual card bobbing.
No breathing buttons.
No particle backgrounds.
No fake execution pulses.

Respect reduced motion and maintain keyboard focus.

8. IMPLEMENT CLEANLY

Inspect active styles before changing them.

Do not append another huge global override stylesheet on top of conflicting
legacy rules. Update the relevant tokens and component styles directly.

Do not refactor unrelated files.
Do not discard teammates’ work.
Do not expose, overwrite, or commit credentials.
Do not restore rejected visual effects from old design documents.

Preserve all existing functional behavior.
Where a live capability is unavailable, state that honestly.

9. VERIFY A FINISHED PRESENTATION

Inspect actual browser screenshots at:
- 1440 × 900
- 1920 × 1080
- approximately 390px mobile width

Judge:
- Is the content comfortably readable?
- Is available width used deliberately?
- Is the primary action obvious?
- Does the workspace have visual depth?
- Does the agent roster feel authored rather than default?
- Does the page still make sense with one mission and no results?
- Are mobile actions reachable and details readable?

Run existing typecheck, lint, unit tests, browser tests, and build.
Do not remove interaction or accessibility assertions to make tests pass.
Update layout-dependent checks only where the intended layout changed.

DELIVERY

Show final Overview, Missions, and Agents screenshots.
Report actual tests run and any remaining failures.

No long report about design philosophy.
No new visual concepts.
No automatic deployment.

This task is complete when the current usable scaffold has become
a coherent, polished CORTEXAI product—not when more decoration has been added.