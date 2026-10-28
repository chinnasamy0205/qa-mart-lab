const fs = require('node:fs');
const path = require('node:path');

const event = JSON.parse(fs.readFileSync(0, 'utf8'));
const toolName = String(event.toolName ?? event.tool_name ?? '');
let args = event.toolArgs ?? event.tool_input ?? {};
if (typeof args === 'string') {
  try { args = JSON.parse(args); } catch { args = {}; }
}

const isEdit = /edit|create|write|replace|patch|insert/i.test(toolName);
const pathKey = /^(path|filepath|file_path|file|uri)$/i;
const patchHeader = /^\*\*\* (?:Add|Update|Delete) File:[ \t]*([^\r\n]+)/gm;

function collectPaths(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectPaths(item, result));
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (pathKey.test(key) && typeof nested === 'string') result.push(nested.replace(/^file:\/\//, ''));
      else collectPaths(nested, result);
    }
  } else if (typeof value === 'string') {
    for (const match of value.matchAll(patchHeader)) result.push(match[1].trim());
  }
  return result;
}

const root = path.resolve(event.cwd || process.cwd());
const appDir = `${path.resolve(root, 'app')}${path.sep}`;
const normalize = (value) => process.platform === 'linux' ? value : value.toLowerCase();
const touchesApp = isEdit && collectPaths(args).some((file) =>
  normalize(`${path.resolve(root, file)}${path.sep}`).startsWith(normalize(appDir)));

if (touchesApp) {
  const reason = 'app/ is read-only for agents. Keep the failing test and report the application bug instead.';
  process.stdout.write(JSON.stringify({
    permissionDecision: 'deny',
    permissionDecisionReason: reason,
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
} else {
  process.stdout.write('{}');
}