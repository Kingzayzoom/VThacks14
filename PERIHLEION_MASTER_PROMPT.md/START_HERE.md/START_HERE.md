# Start here — PERIHELION

This package is a build specification, four art-direction boards, and blank configuration templates. It is not the application source code yet.

## Place in your project

Open your dedicated PERIHELION repository in VS Code. Do not open the Roblox repository for this task.

Copy MASTER_PROMPT.md and docs/RESEARCH_NOTES.md into the project. Put the four images under public/references/ using the included names. Create the supplied .env.local at the project root ONLY if you do not already have one. Never overwrite existing credentials. Keep .env.example checked in and .env.local ignored. Merge .gitignore.snippet rules; do not replace your .gitignore wholesale.

## First Codex message — normal interactive mode

Read MASTER_PROMPT.md in full, docs/RESEARCH_NOTES.md, and all four images in public/references/ before editing. Implement Phase A only: inspect the repository; define the frontend contracts and empty env setup; build PERIHELION's design tokens, layered shell, landing screen, and FIELD workspace with coherent demo state. Frontend first. Do not call paid providers, create production infrastructure, or edit unrelated projects. Run the app and capture actual screenshots at 1440x900 and 390px width. Inspect the screenshots against the references, correct obvious composition/readability problems, then stop for my visual review with commands and test results. Do not stop at a plan without building the checkpoint.

## After Roheen approves the visual direction

/goal Complete Phases B and C of MASTER_PROMPT.md using the approved Phase A design. Implement all specified frontend routes and the deterministic objective-to-recruitment-to-Guardian-to-artifact demo, with working controls, empty-key startup, adapters, environment templates, handoff docs, and tests. Do not invoke paid integrations, deploy, or rewrite the approved design. Finish when typecheck, lint, unit tests, production build, and the main browser demo pass, screenshots have been inspected, and remaining live integrations are honestly documented. If blocked, record the exact blocker instead of claiming success.

Use /goal pause to pause a running goal. If /goal is unavailable, check the installed CLI's help/settings. Official docs list `codex features enable goals`; with your PowerShell wrapper issue, use `codex.cmd features enable goals`. Reopen the relevant Codex session after changing settings if needed. The feature may not surface identically in every IDE/CLI version.

## PowerShell wrapper note

Use codex.cmd, npm.cmd, and npx.cmd when PowerShell blocks the corresponding .ps1 wrappers. Do not weaken the system execution policy just to launch them.

## Expected integration order

Agree on contracts early, while Roheen builds the frontend. After visual and demo acceptance, Zabish/Ashraf connect one real vertical slice: Gemini plan → hosted worker → ANS discovery/verification → policy-controlled action → final artifact → ElevenLabs voice. A browser API key is never a shortcut.

## What's inside

- MASTER_PROMPT.md: full build brief and appended empty environment template.
- .env.local: blank private local config template.
- .env.example: blank shareable key-name template.
- .gitignore.snippet: rules to merge safely.
- docs/RESEARCH_NOTES.md: evidence, source URLs, interpretations, and limitations.
- public/references/: all four PERIHELION reference boards.

No real API keys, tokens, private certificates, or account credentials are included.
