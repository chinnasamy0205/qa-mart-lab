---
name: playwright-failure-analysis
description: Classify Playwright failures as test bug, app bug, data issue or flaky. Use when a run fails.
---

# Playwright failure analysis

1. Call `tests_list_failures` (MCP) or read `reports/results.json`.
2. For each failure record file, line, first error line, expected vs received.
3. Classify: **app bug** (app violates its documented rule), **test bug** (wrong locator/assertion), **data/state** (needs reset), **flaky** (passes on retry).
4. Never "fix" an app bug by weakening the assertion.
5. Output a table: test | class | evidence | next action.
