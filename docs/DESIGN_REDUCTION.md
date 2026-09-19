# Design reduction — 18 September 2026

## Reference audit, before implementation

Inspected the current local homepage in Chrome, plus [Linear](https://linear.app/) and [APHELION](https://heroes.aphelion.center/) directly in Chrome. Found [the deployed homepage](https://cortex-gray-tau.vercel.app/) through GitHub repository metadata and inspected it directly too. The deployment repeats the same layout, with the team's new CORTEXAI name. Fast-forwarded through teammate commit `1c5cec1` before product edits; retain that rename throughout this reduction.

- Linear: a single left-aligned headline, one supporting sentence and generous dark space establish order. Complexity belongs to the product demonstration below. Its restrained navigation and low-contrast supporting copy do not narrate the visual design.
- APHELION: enormous serif type owns the screen. A faint orbital field occupies the open right side, while one small institutional line provides context. The asymmetry works because the visual and the headline have distinct territories. Its archive details are not a reason to cover our hero in labels.
- PERIHELION before: side philosophies, specimen plate, heading metadata, composer label, suggestion row, instrument rule, labeled topology and three principle blocks repeat the headline. The ambient field crosses all of these at similar contrast. Agents starts with an inspector already open, statistics, multiple introductory lines, a legend, activity cards and every control exposed.

## Keep / remove / demote

**Keep:** serif wordmark and headline, exact concise product description, functional objective composer, demo disclosure, workspace access, visual pause; procedural field, shared frame clock, pointer response, reduced-motion and SVG fallbacks. Agents retain their rich network, real state, scopes, handoffs, filtering, roster and mission controls.

**Remove:** homepage side notes, specimen, edition/system metadata, dividing emblem, instrument labels, duplicate topology and principles/footer copy. Remove the Agents manifesto, redundant map captions, family labels and static summary counters. Remove nonfunctional future-navigation placeholders and sidebar artwork.

**Demote:** examples behind one disclosure; keyboard/demo explanation available accessibly; Agents inspector appears on selection and can close; search/filter under a disclosure; branch focus only after selection; recorded activity behind a disclosure. Retain useful runtime states, especially review and disconnected states.

**Composition:** wordmark → promise → composer → one living field. Quiet upper space, denser lower filaments. Agents use the entire stage until a person asks to inspect an agent. No new widgets or fake progress. Ambient motion is visual presence; execution signals still require running mission state.

## Verification plan

Capture identical desktop (1440 × 900) and mobile (390 × 844) homepage/Agents views before and after. Check composer validation, examples, duplicate submission, navigation, mission pause/resume, filtering, inspector open/close and keyboard focus; verify ambient/semantic motion separation, reduced motion, Canvas fallback, no overflow and accessibility. Run typecheck, lint, unit tests, browser tests and production build.

## Comparison after implementation

| Surface | Before | After |
| --- | --- | --- |
| Homepage, desktop | Promise repeated in both margins, metadata, labeled topology and principles | Wordmark, promise and composer own the upper screen; filaments gather below |
| Homepage, mobile | Long stack of suggestions, topology and explanatory sections | Initial page fits the 390 × 844 viewport; examples remain available on demand |
| Agents, desktop | Fixed inspector, counters, introduction and activity cards surround the network | Network fills the stage until selection; only useful state and controls remain |
| Agents, mobile | Roster plus permanent inspector and recorded cards | Roster first, focused inspector only after selection; recorded activity collapsed |

The old homepage captures precede the teammate rename; the final result retains CORTEXAI. This is the same composition being compared, with the shared rename preserved.

Screenshots: [homepage before desktop](screenshots/reduction/before-home-desktop.png), [after desktop](screenshots/reduction/after-home-desktop.png), [before mobile](screenshots/reduction/before-home-mobile.png), [after mobile](screenshots/reduction/after-home-mobile.png); [Agents before desktop](screenshots/reduction/before-agents-desktop.png), [after desktop](screenshots/reduction/after-agents-desktop.png), [before mobile](screenshots/reduction/before-agents-mobile.png), [after mobile](screenshots/reduction/after-agents-mobile.png).

Reproduce the comparison captures with `TEST_BASE_URL=http://127.0.0.1:3020` and `node scripts/capture-reduction.mjs after`. No reference bitmap is used at runtime. Ambient quality comes from contrast and composition around the existing live renderer, not simulated execution.

Final verification: typecheck, lint, 6 unit tests, production build and 10 browser tests pass. Tested desktop/mobile accessibility states have zero axe violations. [Full verification record](TEST_RESULTS.md).
