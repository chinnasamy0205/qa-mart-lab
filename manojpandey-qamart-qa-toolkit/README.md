# manojpandey-qamart-qa-toolkit

QA Mart regression toolkit packaged as a Copilot agent plugin plus an MCP server.

| Part | File |
|---|---|
| Plugin manifest | `plugin.json` |
| Custom instructions | `com.github.copilot/rules/` |
| Prompt files | `com.github.copilot/commands/` |
| Skills | `skills/playwright-failure-analysis/`, `skills/coupon-boundary-testing/` |
| Custom agents | `com.github.copilot/agents/test-reviewer.agent.md`, `qamart-explorer.agent.md` |
| Hooks | `com.github.copilot/hooks/hooks.json` blocks edits to `app/` and runs post-edit checks |
| MCP server | `mcp.json` starts `mcp/qamart-server.cjs` (stdio, no dependencies) |
| Demo tests | `tests/lab/capstone-flows.spec.ts` covers sign-in, coupon math, and order-history access |

## MCP tools
`qamart_health`, `qamart_list_products`, `qamart_validate_coupon`, `qamart_place_order`, `qamart_list_orders`, `qamart_reset`, `tests_last_run_summary`, `tests_list_failures`, `tests_find_flaky`.

Environment: `QAMART_URL` (default `http://127.0.0.1:3000`), `QAMART_REPORT` (default `<workspace>/reports/results.json`), `QA_PASS`.

## Try it
After the marketplace entry is published, install it in Copilot Chat with:

```text
/plugin marketplace add happiestmindslabsu2/qa-mart-lab
/plugin install manojpandey-qamart-qa-toolkit@qa-mart-lab
```

For a local clone, run `npm ci` and `npx playwright install chromium` from the repo root, then register this plugin folder in VS Code user settings:

	 ```json
	 "chat.plugins.enabled": true,
	 "chat.pluginLocations": {
		 "<absolute path to repo>/solutions/plugin/manojpandey-qamart-qa-toolkit": true
	 }
	 ```

3. Run `npm test -- tests/lab/capstone-flows.spec.ts --project=chromium` from the repo root.
4. Check **MCP: List Servers** and **Configure Tools**. Try `/run-capstone-smoke` or `/test-from-story US-104` in Copilot Chat.

Verify the MCP server without VS Code with `npm run mcp:smoke` from the repo root. The MCP tools expose read-only QA queries plus explicit order/reset controls; those mutating tools are not enabled in the explorer agent.
