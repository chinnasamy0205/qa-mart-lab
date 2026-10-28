---
name: playwright-failure-analysis
description: "Use when a Playwright run failed, when asked why tests failed, to summarise or triage failures, or to read reports/results.json or any Playwright JSON report."
---
# Playwright failure analysis

## Steps
1. If there is no recent report, run `npm test` (or the project the user named) so the JSON reporter writes `reports/results.json`.
2. Run the summary script from the repository root:
   `node .github/skills/playwright-failure-analysis/summarize-report.cjs reports/results.json`
   The script sits in the same folder as this SKILL.md. When the skill comes from a plugin, run the plugin's copy by its full path (`${PLUGIN_ROOT}` is not expanded inside a skill).
3. Group the failures by likely cause:
   - **Application bug**: a correct test and a response that contradicts the story (check `docs/stories/`).
   - **Test bug**: wrong expectation, stale selector, shared state, hard wait.
   - **Environment**: app not running, port busy, browser missing, timeouts on every test.
   - **Flaky**: a test that passed and failed in the same run.
4. For each group give the evidence (status codes, message, file and line) and the next action.
5. Never edit `app/` or weaken an assertion to turn a run green.

## Output
A table of groups with counts, then a short list per group. Put confirmed facts before guesses.
