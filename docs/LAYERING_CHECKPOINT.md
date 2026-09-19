# Layering checkpoint - September 19, 2026

Branch `feat/layering-atmosphere`, based on `98d924a`. Preview: http://127.0.0.1:3026/field. The approved information architecture, typography, spacing, geometry and interaction model are preserved.

## Treatment

One CSS light field behind the workspace uses broad blue-grey `#536b8b28` and warm-neutral `#81746610` radial lighting. Its pseudo-element moves from `translate3d(-1%,0,0)` to `translate3d(1.5%,1%,0)` with opacity .65 to 1 over 48 seconds, alternating (96-second full cycle). Only transform and opacity animate; there is no frame-loop JavaScript, Canvas, pointer tracking or blur. Mobile (760px and below), coarse pointers and reduced motion are static. Hidden pages pause through `visibilitychange`. The field is non-interactive and hidden from assistive technology.

Opaque product surfaces keep contrast independent of ambient motion. Static graphite material, shallow shadows and fine inner highlights distinguish navigation, mission, raised decision panel and inspector. Task separators soften into the mission surface. Selection gets local lighting; working-agent tiles get restrained role tones. Disconnected previews retain dashed, unlit tiles. Existing task relationships in the inspector are unchanged.

## References and dependency decision

- [GetLayers home hero](https://www.getlayers.ai/): asymmetric edge light and a quiet middle ground behind legible foreground content.
- [Soffit 002 free preview](https://www.getlayers.ai/layer/soffit-002): broad soft transitions and depth behind foreground content; its saturated cyan palette was rejected.
- [GetLayers documentation](https://www.getlayers.ai/docs): separate background layers from product composition. No GetLayers MCP was available; public previews/docs only, no prompts or premium source downloaded.
- [ShaderGradient](https://shadergradient.co/) and [official renderer documentation](https://github.com/ruucm/shadergradient): studied soft moving illumination. Package `@shadergradient/react` 2.4.20 declares React 18/19 peers; current app is Next 16.3.5 / React 19.3.0. The documented App Router compatibility matrix covers Next 15, not this exact version. The renderer package alone is 384,188 bytes unpacked (not browser transfer size); documented setup additionally requires R3F, Three, three-stdlib and camera-controls, none installed here. Its API provides animate on/off and pixel-density controls, but lifecycle/mobile/reduced-motion policy would still need app integration. Chose the explicitly permitted CSS equivalent instead of installing a new rendering stack. No claim of runtime validation of that unused package.

Dependencies added: **none**. Also rejected: visible grain, luminous blobs, bright spectral colors, glass/blur, per-card moving gradients, decorative relationship webs and pointer parallax.

## Actual verification

Typecheck, lint and production build passed. Unit tests: **11 passed, 0 failed**. Final complete browser run: **14 passed, 0 failed (14.0s)**. Existing keyboard, objective, task, category/search, inspector, voice-draft and accessibility coverage is preserved. Axe reports zero violations on tested desktop/mobile states. Added motion suppression/lifecycle coverage; the hidden-page event is synthetic for deterministic headless testing.

Matched screenshots at 1440x900, 1920x1080 and 390x844 show unchanged measured shell/panel bounds for every route/size, no horizontal overflow, clear mission/task/review hierarchy, and readable mobile details. Only correction: case-match the role-tile selectors to existing family names. Final images inspected; no further design round.

| Captured desktop resources, including route prefetch | Before | After | Change |
| --- | ---: | ---: | ---: |
| JavaScript (gzip estimate) | 302,389 B | 302,549 B | +160 B |
| CSS (gzip estimate) | 9,190 B | 9,984 B | +794 B |
| JS / CSS resource counts | 15 / 4 | 15 / 4 | 0 |

The total increase is **954 bytes gzip (0.93 KiB)**. Cold-context samples collect 120 animation frames per route/size before freezing animation at its initial phase for still comparison. Median frame interval was 16.7ms and maximum p95 16.8ms, before and after; no sampled interval exceeded 34ms. These are local Chromium smoke measurements, not physical-phone or integrated-GPU hardware benchmarks or a full input-latency/LCP study. No added per-frame JS or network resources; mobile ambient animation is disabled.

Reproduce: set `TEST_BASE_URL` to the appropriate production preview and run `node scripts/capture-layering.mjs before` or `after`. Raw measurements: [before](screenshots/layering/before/measurements.json), [after](screenshots/layering/after/measurements.json).

## Matched screenshots

| Screen | Desktop before | Desktop after | Wide before / after | Mobile before / after |
| --- | --- | --- | --- | --- |
| Overview | [Before](screenshots/layering/before/overview-desktop.png) | [After](screenshots/layering/after/overview-desktop.png) | [Before](screenshots/layering/before/overview-wide.png) / [After](screenshots/layering/after/overview-wide.png) | [Before](screenshots/layering/before/overview-mobile.png) / [After](screenshots/layering/after/overview-mobile.png) |
| Missions | [Before](screenshots/layering/before/missions-desktop.png) | [After](screenshots/layering/after/missions-desktop.png) | [Before](screenshots/layering/before/missions-wide.png) / [After](screenshots/layering/after/missions-wide.png) | [Before](screenshots/layering/before/missions-mobile.png) / [After](screenshots/layering/after/missions-mobile.png) |
| Agents | [Before](screenshots/layering/before/agents-desktop.png) | [After](screenshots/layering/after/agents-desktop.png) | [Before](screenshots/layering/before/agents-wide.png) / [After](screenshots/layering/after/agents-wide.png) | [Before](screenshots/layering/before/agents-mobile.png) / [After](screenshots/layering/after/agents-mobile.png) |

Additional final coverage: [desktop inspector](screenshots/layering/verification/agent-detail-desktop.png), [mobile sheet](screenshots/layering/verification/agent-detail-mobile.png). All test captures are in `screenshots/layering/verification/`.

No backend, API contracts, security rules, credentials, dependency/lockfile or mission behavior changes. Live provider execution was not exercised. The pre-existing local `next-env.d.ts` difference is preserved and excluded from the commit. No push, deployment or connection pass.
