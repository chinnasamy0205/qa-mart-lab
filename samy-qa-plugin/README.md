# samy-qa-plugin

GitHub Copilot agent plugin for testing QA Mart.

| Component    | Files                                                                          |
| ------------ | ------------------------------------------------------------------------------ |
| Instructions | `instructions/qamart-testing.instructions.md`                                  |
| Prompt files | `prompts/test-from-story.prompt.md`, `prompts/bug-report.prompt.md`            |
| Skills       | `skills/coupon-boundary-testing`, `skills/playwright-failure-analysis`         |
| Agents       | `samy-test-reviewer` (read-only), `samy-test-planner`                          |
| MCP server   | `mcp/qamart-server.cjs` (health, validate coupon, list failures)               |
| Hooks        | `guard-app.cjs` (blocks edits to `app/`), `secret-scan.cjs` (warns on secrets) |

## Install

1. Push this folder to a GitHub repo and clone it.
2. Add to VS Code user settings (experimental):

```json
{
  "chat.plugins.enabled": true,
  "chat.pluginLocations": { "/absolute/path/to/samy-qa-plugin": true }
}
```

3. Verify under Extensions > `@agentPlugins`, Chat > Open Customizations, and **MCP: List Servers**.

Instructions and prompt files are not loaded by the plugin system itself. Copy them into `.github/instructions/` and `.github/prompts/` of the test project to activate them.

## Demo

Start QA Mart (`npm start`), then run `/test-from-story` with `docs/stories/US-101-coupon-story.md`.

No secrets are stored in this repo.
