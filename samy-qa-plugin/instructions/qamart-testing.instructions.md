---
applyTo: "tests/**/*.ts"
---

# QA Mart testing rules

- Use Playwright Test with `@playwright/test`; import `test`/`expect` from `tests/fixtures.ts`.
- Locators: `getByRole`, `getByLabel`, `getByTestId`. No CSS/XPath, no `waitForTimeout`.
- Test data comes from `tests/test-data.ts`. Never hard-code credentials or tokens.
- One behaviour per test. Title format: `US-1xx: <behaviour>`.
- Assert exact values (price, discount, stock), not just visibility.
- Never edit `app/`. If the app is wrong, keep the failing test and report a bug.
- Protected flows: coupon validation, stock limits, secure ordering.
