## Visible motion correction

The owner requested visibly moving atmosphere. Desktop now uses a 12-second sweep each direction, mobile 16 seconds, with larger travel, rotation, changing proportions and stronger pearl/mauve light. Static-mobile behavior is removed; reduced motion remains static and hidden tabs pause. This supersedes the slower/static treatment documented below.

Validation: typecheck, lint, build, 11 unit tests and all 14 browser tests pass (17.3s). The motion test now checks changing transforms on both desktop and mobile, plus hidden-page pause and reduced-motion suppression. No interaction assertions removed. Recorded actual eight-second clips: [desktop](screenshots/waterlight-motion/desktop-motion.webm), [mobile](screenshots/waterlight-motion/mobile-motion.webm). Preview remains http://127.0.0.1:3027/missions. No dependencies, backend changes or deployment.

# Pearl / mauve waterlight - September 19, 2026

The owner supplied a ShaderGradient waterPlane preset: pearl `#f5f9ff`, mauve `#e4bce8`, black, slow motion and grain off. Adapted its visual principle into the existing CSS environment: elongated diagonal light bands separated by a dark trough, with a 48-second alternate drift/rotation/scale. This is a CSS interpretation, not the actual ShaderGradient renderer or an exact reproduction of its wave simulation. Debug axes, export settings and camera helpers do not belong in the product and were omitted.

Branch `feat/pearl-waterlight`, based on `51a6f60`. Preview: http://127.0.0.1:3027/field.

The only product change is the background's CSS. Opaque surfaces, approved geometry/type, interactions and backend remain unchanged. Mobile/coarse-pointer and reduced-motion backgrounds are static; hidden pages pause. No new dependencies, JavaScript payload, credentials or deployment. Screenshot scripts now accept output-directory environment variables so future passes preserve earlier evidence.

Validation: typecheck, lint, production build passed; 11 unit tests and all 14 browser tests passed (16.9s), no failures. Axe reports zero violations in tested states. Screens inspected at 1440x900, 1920x1080 and 390x844. Measured shell/panel bounds match the previous checkpoint on all nine route/viewport combinations, with no overflow. Compared with layering checkpoint: JS payload unchanged; CSS +166 raw bytes / +64 gzip bytes. Local 120-frame samples: median 16.7ms, maximum p95 16.8ms, zero intervals over 34ms. These are local Chromium smoke measurements, not physical-device benchmarks.

| Screen | Previous atmosphere | New desktop | New mobile |
| --- | --- | --- | --- |
| Overview | [Previous](screenshots/layering/after/overview-desktop.png) | [Desktop](screenshots/waterlight/after/overview-desktop.png) | [Mobile](screenshots/waterlight/after/overview-mobile.png) |
| Missions | [Previous](screenshots/layering/after/missions-desktop.png) | [Desktop](screenshots/waterlight/after/missions-desktop.png) | [Mobile](screenshots/waterlight/after/missions-mobile.png) |
| Agents | [Previous](screenshots/layering/after/agents-desktop.png) | [Desktop](screenshots/waterlight/after/agents-desktop.png) | [Mobile](screenshots/waterlight/after/agents-mobile.png) |

[Raw measurements](screenshots/waterlight/after/measurements.json). Wide screenshots use the `-wide.png` suffix in the same directory. Full interaction captures are in `screenshots/waterlight/verification/`.
