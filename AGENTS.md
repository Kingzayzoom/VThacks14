# CORTEXAI

Yo, Hackathon time, be primed.

Read CORTEXAI_DESIGN_FINISH.md, CORTEXAI_VISUAL_RESET.md, docs/BUILD_STATUS.md and docs/work/README.md before changing the product. MASTER_PROMPT.md remains architectural history; its rejected visual direction is superseded.

## Current boundary
Owner-authorized design finish across existing routes; preserve Phase A demo architecture and initial contracts. Stop for Roheen's visual approval before Phase B. Do not deploy or initialize paid services, providers or microphone capture. Demo must work with every environment value empty. Preserve existing .env.local values and teammate edits; never print secrets.

## Active visual foundation - design finish, September 19, 2026

Read `CORTEXAI_DESIGN_FINISH.md` before UI changes. It refines the reset while preserving its information architecture; both owner briefs supersede historical visual prompts and boards. The work feels alive; the interface stays steady. Use Geist, graphite surfaces, warm-white primary actions and restrained blue focus/selection. Keep the compact identity, 224px sidebar, single 60px top bar, 32-40px workspace insets, and up to 1280px of working content. Use 32px page headings, 28px mission headings, 14-16px essential body/row text and 12-13px metadata. Surfaces use distinct graphite tones, hairline borders, restrained shadows and 12px corners. Overview uses a roughly 2:1 task/context split; Missions uses aligned compact rows; Agents uses tonal role tiles with a natural side inspector on desktop and a focus-contained modal sheet on smaller screens. Keep the current composition; do not reset the product again or return to tiny, flat presentation. Do not restore neural wallpaper, filament canvases, orbital objects, oversized serif typography, glow or ambient animation. Historical rendering modules/assets are retained but unmounted. Identity, standing, authority and runtime remain separate; Memory and Voice are disconnected previews. Reviewed ElevenLabs drafts and backend/security boundaries remain intact. The connection pass and deployment are not authorized by this reset.

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
