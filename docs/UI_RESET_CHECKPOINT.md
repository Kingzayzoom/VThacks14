# Product UI reset checkpoint

Starting commit: `986ec5f7a95d64a4df0eada3ab086b8ae311219e`.
Feature branch: `feat/product-ui-reset`.
Safe starting reference: `checkpoint/pre-ui-reset-986ec5f`.
Pre-existing `next-env.d.ts` changes are excluded from the checkpoint.

Active styling is tokens + global primitives + entry/agents/voice styles. Historical refinement/living styles are no longer imported. Atmosphere and graph loops are unmounted, with source assets retained. No framework or dependency changes.

Overview and detail prioritize objective, ordered dependencies, real completed-task counts, review, results availability and secondary activity. Agents is roster-only with the seven existing category filters and contextual evidence drawer. Text drafts survive dialog/voice transitions; reviewed voice drafts survive closing and reopening voice. No provider, backend, security, contract, environment or teammate files changed.

References: briefly inspected the first screens of Linear and heroes.aphelion.center for clear hierarchy, navigation and spacing. No layouts or branding cloned.

Validation complete: typecheck, lint, 11 unit tests, production build and all 13 browser cases pass (12 in the final full run plus the corrected locator case on a focused rerun). See [actual results and limitations](TEST_RESULTS.md). Final screenshots are in `docs/screenshots/reset/`. Stop for owner review.
