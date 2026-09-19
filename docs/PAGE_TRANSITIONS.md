# Page transition checkpoint

Reference: [Textura](https://textura.agency/) and its [Projects page](https://textura.agency/projects). Observed a black full-screen loading treatment, centered numeric indicator and pale blue/pink edge strip. CORTEXAI adapts the framing and palette with a destination label and an indeterminate line; no percentage implies invented loading progress.

The curtain appears immediately on ordinary same-origin page links. Next navigation runs normally beneath it; after pathname commit, the curtain remains until the 320ms minimum presentation elapses and lifts in 280ms. Programmatic navigation (including new missions) and browser history use the same transition. Initial page loads, same-page links, search/hash-only changes and in-page controls do not trigger it. Modified/new-tab/download/external links are ignored.

The covered page is temporarily inert and busy; a polite status announces the destination. Completion focuses its heading. Escape dismisses the curtain, and an eight-second fail-safe restores access after a stalled/cancelled navigation. Reduced motion removes the animation and minimum delay. Mobile uses the same compact treatment. No route/data/API changes or dependencies.

Branch: `feat/page-transitions`, base `ebc0f92`. Production preview: http://127.0.0.1:3028/field (`CORTEX_BUILD_DIR=.next/transitions`).

Verification: typecheck, lint, production build passed; **11 unit tests and 17 browser tests passed**, zero failures. Three new browser cases cover desktop/mobile page links, history, programmatic mission creation, heading focus, same-page exclusions and keyboard/reduced-motion navigation. Existing interaction/accessibility assertions remain. Axe reports zero violations in tested desktop/mobile states. First run caught a heading-focus selector bug; corrected it and reran the complete suite successfully (27.2s). Final desktop/mobile screenshots inspected. Existing pre-work `next-env.d.ts` change preserved and excluded; no push, deployment, connection pass or backend/security/credential edits.

- [Transition recording](screenshots/transitions/page-transitions.webm)
- [Desktop curtain](screenshots/transitions/curtain-desktop.png)
- [Mobile curtain](screenshots/transitions/curtain-mobile.png)
- Remaining route, inspector and voice-flow captures: `screenshots/transitions/verification/`.
