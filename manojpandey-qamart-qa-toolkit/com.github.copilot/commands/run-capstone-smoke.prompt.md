---
description: Run the three QA Mart capstone regression flows and report evidence.
argument-hint: optional Playwright project, for example chromium or ui-v2
---

Run the capstone regression spec for project `${input:project:chromium}`:
`npx playwright test tests/lab/capstone-flows.spec.ts --project=${input:project:chromium}`

Do not edit application files or change test expectations. If a check fails, compare it with its story in `docs/stories/` and report whether the evidence points to an app bug, test bug, or environment issue. Include the command, each test result, and the relevant story criterion. Do not run order placement or reset tools; these checks are read-only.