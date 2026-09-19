# CORTEXAI — Product UI reset

Execute this task first. Do not start the connection pass until this checkpoint has been reviewed.

## Decision and scope

The owner has rejected the current visual direction. This brief supersedes earlier visual instructions in MASTER_PROMPT.md, design documents, and image references that ask for neural wallpaper, orbital nodes, enormous serif wordmarks, pervasive glow, or “nothing static.” Preserve the project's security requirements and backend architecture.

Build a modern work application, not a sci-fi illustration. The work feels alive; the interface stays steady. Replace the presentation across the existing entry, overview, missions, mission detail, agents, and settings views. Reuse routing, state, actions, validation, and existing voice controls.

We have limited builder usage. Make one implementation pass and one browser correction pass. No alternate concepts, new moodboards, lengthy research report, shader experiments, or open-ended perfection loop.

## Before editing

- Inspect git status, the current branch, and repository instructions. Do not edit during an unresolved merge or rebase. Preserve local and teammate work. Never force-push, reset --hard, or run broad git clean commands.
- Work on a dedicated feature branch. Record the starting commit. Preserve a safe local checkpoint without committing credentials or unrelated work. Do not push or deploy in this task.
- Briefly inspect https://linear.app and https://heroes.aphelion.center. Extract clarity, useful information hierarchy, composition, and restraint—not their logos or entire layouts. Limit reference browsing to the relevant first screens.
- Read the affected components and active CSS/imports. Read docs/work/README.md for the integration boundary. Do not spend this pass rereading every historical design prompt.

## Visual system: concrete decisions

Use the installed Geist family for headings and UI. Normal-case labels. No stretched serif all-caps page titles; monospace only for IDs, scopes, and actual technical evidence. Keep the CORTEXAI name and existing internal identifiers. Remove leftover P monograms from visible CortexAI UI.

Use these starting tokens, adjusting only for verified accessibility needs:

- App background: #0C0D10
- Navigation: #101115
- Surface: #15171C
- Hover/selection: #1D2027
- Border: #282B33
- Primary text: #F4F4F5
- Secondary text: #A4A8B3
- Accent: #6694FF, used sparingly for links/focus/selection
- Primary buttons: warm-white fill, dark text
- Green/amber/red: actual success/review/error semantics, with text and icons

One main accent, not a rainbow for every agent. Corners approximately 8px; modest shadows only for overlays. Body text 14–16px, supporting text 12–13px. Page headings 28–32px, entry headline 44–56px desktop. No tiny 8px telemetry. Use a consistent 4/8px spacing system and clear focus styles.

Remove the active full-page atmosphere: filament canvases, strands, particles, fog, halos, contour wallpaper, orbital backgrounds, and backdrop motion. Unmount their loops; do not merely hide canvases behind opacity. Do not destroy source assets or reference files to accomplish this.

Consolidate the affected styling. Do not append another huge override stylesheet over conflicting historical rules. Reuse existing dependencies and primitives. No new design framework, graph engine, 3D library, or animation dependency.

## Shared application shell

A quiet sidebar around 208–224px, one top bar around 56px, and a legible main workspace. At wide desktop sizes, constrain reading areas rather than stretching a single sentence across 1500px. On mobile, collapse navigation and use full-width drawers.

Primary navigation: Overview, Missions, Agents; Settings at the bottom. Rename the visible FIELD label to Overview while preserving /field routing. Do not add dead navigation destinations. Use one mode/connection indication, not repeated DEMO badges everywhere.

Keep the command composer and voice access, but do not keep a giant unrelated command dock on every screen. Place mission entry in a consistent reachable location. Retain unsent drafts when opening and closing voice or drawers.

## Entry page

This is a start screen, not a luxury-brand poster.

- Compact CORTEXAI wordmark in navigation; no giant duplicate brand title.
- Headline: “Delegate work. Stay in control.”
- Supporting sentence: “Plan tasks, coordinate specialist agents, and review the results.”
- One obvious objective composer, approximately 640px max width.
- Clearly labeled Start mission button. Preserve the current submit behavior and validation.
- Existing voice entry as a secondary action; do not capture the microphone on load.
- One discreet, honest mode label and one optional example entry.
- Below, a compact recent-missions section using existing state. When empty, show a useful empty state, not invented activity.
- No planets, illustrations, KPI cards, fake endorsements, tool-logo walls, philosophy fragments, repeated CTAs, or decorative technical captions.

Use negative space deliberately, but do not shrink useful controls into a small island on a huge screen.

## Overview /field

Replace the giant decorative coordination graph with a work-first overview. Prioritize the selected mission, task progress, the next required decision, and available output.

Show an actual task list and a contextual review panel only when a review exists. Use completed-task counts derived from state, not invented completion percentages or elapsed-time progress. Keep activity collapsed or secondary. A selection opens the existing contextual inspector.

Avoid four identical KPI cards. A user should identify what is running and what needs their input immediately.

## Missions and mission detail

Replace the nearly empty “Mission register” presentation with a compact, useful table/list: mission name, state, current step/agent when available, task count, and last update when available. Search only needs to be present if it helps navigate the actual list.

Use existing mission data; do not fabricate history to fill space. A one-mission workspace should be intentionally compact. An empty workspace gets one clear Create mission action.

Mission detail should prioritize objective, ordered tasks/dependencies, activity, and results. Keep current behaviors. Use one contextual review surface. Do not claim missing backend pause/cancel functionality exists; capability-gate controls.

## Agents

Roster first, not a neural wallpaper. Use a well-spaced, selectable list/table with recognizable compact icons, name, role/capability, runtime state, and assignment when available. Preserve search, seven category filters, selection, keyboard behavior, and responsive views.

Selecting an agent opens a clean details drawer: identity, standing, authority, runtime, capabilities, task, and expandable evidence. Those four states stay separate; a verified identity does not imply permission or good standing. Keep preview agents labeled Not connected, never like hired workers.

If keeping the existing Map mode is inexpensive, make it secondary. Replace decorative orbs with stable small nodes and exactly one clean connector per actual relationship. No bundling dozens of lines around each node, no free-floating satellite particles, no perpetual rotation. Labels and hit targets do not move.

Do not add a second new graph system. If a map is not useful to the current task, the roster is enough.

## Motion

Revoke the old “everything must move” instruction.

Buttons, labels, tables, navigation, and body text stay still. Use short 120–200ms transitions for hover, focus, and opening drawers. Status motion only reflects actual state. A real in-progress indicator or a confirmed handoff may animate; idle cards do not breathe or shimmer. Respect reduced-motion and keyboard users.

Do not animate false recruitment, verification, execution, or completion. Local demo events remain explicitly demo events. No fake trust scores.

## Protect functionality

Do not rewrite MockControlApi, implement the live adapter, change Python services, change cryptography, modify ANS authorization, or invoke paid providers in this pass. Keep contracts and routes compatible. Preserve the reviewed ElevenLabs draft_mission flow and server-side key handling.

No secret values in logs, screenshots, fixtures, generated reports, git, or public/. Preserve existing .env and .env.local values; do not replace them with blank templates.

## Acceptance and stop

Inspect the actual browser at 1440x900 and approximately 390px, with a quick 1920px check for excessive stretching. Check entry, overview, agents, mission detail, and empty/error states.

Confirm objective submission, navigation, agent search/filters/selection, closing inspectors, and voice/text handoff still work. Update tests that intentionally depended on removed visual chrome; do not delete behavioral assertions to obtain a pass.

Run package.json's actual typecheck, lint, unit tests, browser tests, and build scripts. On this Windows setup use npm.cmd when the PowerShell wrapper is blocked. Run commands sequentially and stop on errors rather than blindly proceeding.

Fix clear regressions and inspect one final screenshot set. No additional subjective refinement rounds. Return the changed files, real screenshots, tests actually run, unresolved issues, and the checkpoint commit. Update the active design guidance in a short note so later work does not restore the rejected effects. Stop for review; do not begin backend integration or deploy automatically.
