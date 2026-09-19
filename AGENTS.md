# PERIHELION

Yo, Hackathon time, be primed.

Read MASTER_PROMPT.md, docs/RESEARCH_NOTES.md, docs/BUILD_STATUS.md and the four public/references boards before changing the product.

## Current boundary
Phase A only: tokens, atmosphere, application shell, entry composer, interactive FIELD, shared fixtures and initial contracts. Stop for Roheen's visual approval before Phase B. Do not deploy or initialize paid services, providers or microphone capture. Demo must work with every environment value empty. Preserve existing .env.local values and teammate edits; never print secrets.

## Living visual foundation
The latest user request explicitly authorizes the `/agents` frontend extension using `references/agentimage.png`. Keep other Phase B features behind the existing design gate. Agents uses the existing demo mission roster; Memory and Voice are disconnected concept previews, not admitted workers. Preserve this distinction during integration.

Read `references/realstarterpage.png` and `references/realcontrolcenter.png` as well as the original boards. Ambient presence is allowed by the latest brief; execution motion still derives from mission state. Keep Canvas isolated from application logic, share the frame clock, honor visual pause/reduced motion, and preserve SVG/CSS fallbacks. Do not restore bitmap wallpaper.

## Ownership
Roheen owns product, frontend, design and visual approval. Zabish and Ashraf own hosted agents/backend/ANS/credentials. Their exact integration split still needs agreement; no presumed assignments. One writer for shared contracts and lockfiles.

## Architecture / commands
Next.js App Router, React, strict TypeScript; native CSS tokens plus Tailwind utilities without preflight; Framer Motion; procedural Canvas atmosphere; Zod application contracts. UI -> ControlApi -> MockControlApi. No provider calls in components. Run npm.cmd install, npm.cmd run dev. Checks: npm.cmd run typecheck, npm.cmd run lint, npm.cmd test, npm.cmd run build, npm.cmd run test:e2e (local server running). Use .cmd wrappers in PowerShell; do not change execution policy.

Original source package was nested under PERIHLEION_MASTER_PROMPT.md/, documents/ and references/. Canonical copies now live at the brief's expected paths; originals preserved. This workspace initially had no app/package configuration or git repository.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
