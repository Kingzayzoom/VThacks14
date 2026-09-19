> **Active live integration (September 19, 2026):** The owner approved the frontend and authorized hub integration and GitHub publication. Preserve the approved design. This supersedes historical Phase A connection restrictions below. Read `docs/LIVE_INTEGRATION.md` and `docs/contracts.md`. Demo uses MockControlApi; live uses HttpControlApi and the existing Python hub, with no silent fallback. CONTROL registers only `start_mission` through the shared creation path and cannot approve Guardian actions. Keep identity, standing, authority and runtime separate; label simulator evidence. Do not edit environment values or deploy automatically.

> **Page transitions:** Owner-authorized Textura-inspired route curtain: near-black full-screen surface, compact CORTEXAI identity, destination label, indeterminate pearl/mauve line, and upward reveal. It covers only actual pathname changes (including history and programmatic mission navigation), not initial loads, same-page links, hash/query changes, dialogs, filters or agent selection. Navigation is never delayed; normal presentation is roughly 600ms, reduced motion removes the delay/wipe. Preserve focus transfer to the destination heading, Escape dismissal and an eight-second fail-safe. No fake loading percentages. See `docs/PAGE_TRANSITIONS.md`.

> **Motion correction:** The owner explicitly requests visible movement, including mobile. The pearl/mauve field now travels, turns and changes proportions over 12 seconds each direction on desktop / 16 seconds on mobile. This supersedes older static-mobile and 48-second guidance below. Reduced motion stays static; hidden tabs pause. Product surfaces and text remain fixed.

> **Latest atmosphere refinement:** The owner supplied a ShaderGradient waterPlane preset using pearl `#f5f9ff`, muted mauve `#e4bce8` and black. Interpret it as one broad diagonal light field with a dark trough, no grain, no axes/helpers, and slow 48-second alternate transform/opacity motion. Keep the existing CSS renderer, static mobile/reduced-motion treatment, hidden-page pause and opaque product surfaces. Layout, typography and application behavior stay approved and unchanged. See `docs/WATERLIGHT_CHECKPOINT.md` for the implementation and evidence.

# CORTEXAI

Yo, Hackathon time, be primed.

Read CORTEXAI_LAYERING_ATMOSPHERE.md, CORTEXAI_DESIGN_FINISH.md, CORTEXAI_VISUAL_RESET.md, docs/BUILD_STATUS.md and docs/work/README.md before changing the product. MASTER_PROMPT.md remains architectural history; its rejected visual direction is superseded.

## Current boundary
The owner approved the frontend and authorized the live integration pass. Connect the existing hub, Commander, ANS and deterministic Guardian through ControlApi. Demo must work with empty environment values. Voice captures audio only after the user starts a conversation. Keep credentials server-side and preserve environment files and teammate changes. GitHub feature-branch publication is authorized; deployment is not.

## Active visual foundation - layering checkpoint, September 19, 2026

Read `CORTEXAI_LAYERING_ATMOSPHERE.md` and `CORTEXAI_DESIGN_FINISH.md` before UI changes. It refines the reset while preserving its information architecture; both owner briefs supersede historical visual prompts and boards. The work feels alive; the interface stays steady. Use Geist, graphite surfaces, warm-white primary actions and restrained blue focus/selection. Keep the compact identity, 224px sidebar, single 60px top bar, 32-40px workspace insets, and up to 1280px of working content. Use 32px page headings, 28px mission headings, 14-16px essential body/row text and 12-13px metadata. Surfaces use distinct graphite tones, hairline borders, restrained shadows and 12px corners. Overview uses a roughly 2:1 task/context split; Missions uses aligned compact rows; Agents uses tonal role tiles with a natural side inspector on desktop and a focus-contained modal sheet on smaller screens. Keep the current composition; do not reset the product again or return to tiny, flat presentation. Do not restore neural wallpaper, filament canvases, orbital objects, oversized serif typography, glowing borders or foreground ambient animation. The latest layering brief permits ONE quiet CSS light field behind the workspace: 48-second alternate transform/opacity motion, static on mobile/coarse pointers or reduced motion, paused when the page is hidden. Opaque product surfaces keep text contrast independent of that field. Use the shared surface material, fine inner highlights and shallow shadows; no per-card animated backgrounds, WebGL dependency, blur, particles or decorative connections. Historical rendering modules/assets are retained but unmounted. Identity, standing, authority and runtime remain separate; Memory and Voice are disconnected previews. CONTROL now uses confirmed start_mission creation. Backend/security boundaries remain independent. Deployment remains outside this checkpoint.

## Ownership
Roheen owns product, frontend, design and visual approval. Zabish and Ashraf own hosted agents/backend/ANS/credentials. Their exact integration split still needs agreement; no presumed assignments. One writer for shared contracts and lockfiles.

## Architecture / commands
Next.js App Router, React, strict TypeScript; native CSS tokens plus Tailwind utilities without preflight; Framer Motion for short interaction transitions; Zod application contracts. UI -> ControlApi -> MockControlApi. No provider calls in components. Run npm.cmd install, npm.cmd run dev. Checks: npm.cmd run typecheck, npm.cmd run lint, npm.cmd test, npm.cmd run build, npm.cmd run test:e2e (local server running). Use .cmd wrappers in PowerShell; do not change execution policy.

Original source package was nested under PERIHLEION_MASTER_PROMPT.md/, documents/ and references/. Canonical copies now live at the brief's expected paths; originals preserved. This workspace initially had no app/package configuration or git repository.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
