---
description: QA Mart conventions for writing and changing Playwright specs.
applyTo: tests/**/*.spec.ts
---

# QA Mart Playwright rules

- Read the matching story in `docs/stories/` and `docs/team-conventions.md` before adding coverage.
- Protect these capstone flows: US-104 sign-in, US-101 coupon calculation, and US-102 order-history access.
- Import shared `test` and `expect` from `tests/fixtures.ts`; get accounts, prices, and coupon codes from `tests/test-data.ts`.
- Prefer accessible locators and web-first assertions. Do not use fixed waits, XPath, generated classes, or product position.
- Keep one behavior per test and include the story and acceptance criterion in its title.
- Never weaken an expectation to match the current app. If behavior contradicts a story, report the bug and preserve the test.
- Run the focused spec, `npm run typecheck`, and `npm run lint:specs` after changes.