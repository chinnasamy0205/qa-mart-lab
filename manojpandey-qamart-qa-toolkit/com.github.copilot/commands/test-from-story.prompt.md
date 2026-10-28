---
description: Turn a QA Mart story into a focused Playwright test plan and spec.
argument-hint: story id, for example US-104
---

Story: ${input:story:US-104}

Read the matching file in `docs/stories/` and `docs/team-conventions.md`. If the story does not exist, stop and say so.

1. List acceptance criteria and identify happy-path, negative, and boundary coverage.
2. Create or update one isolated spec under `tests/lab/`, using shared fixtures and test data.
3. Keep the story and AC in test titles; use accessible locators and specific assertions.
4. Do not modify `app/`, weaken expected behavior, or use seeded failure expectations as a new baseline.
5. Run the focused spec, `npm run typecheck`, and `npm run lint:specs`. Report exact results and any app bug separately.