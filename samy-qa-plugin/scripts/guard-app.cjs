// preToolUse guard: deny agent edits under app/.
const fs = require('node:fs');
const path = require('node:path');

const event = JSON.parse(fs.readFileSync(0, 'utf8'));
const toolName = String(event.toolName ?? event.tool_name ?? '');
let args = event.toolArgs ?? event.tool_input ?? {};
if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = {}; } }

const EDIT_TOOL = /edit|create|write|replace|patch|insert/i;
const PATH_KEY = /^(path|filepath|file_path|file|uri)$/i;
const PATCH_HEADER = /^\*\*\* (?:Add|Update|Delete) File:[ \t]*([^\r\n]+)/gm;

function paths(v, out = []) {
  if (Array.isArray(v)) v.forEach((x) => paths(x, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (PATH_KEY.test(k) && typeof x === 'string') out.push(x.replace(/^file:\/\//, ''));
      else paths(x, out);
    }
  } else if (typeof v === 'string') {
    for (const m of v.matchAll(PATCH_HEADER)) out.push(m[1].trim());
  }
  return out;
}

const root = path.resolve(event.cwd || process.cwd());
const appDir = path.join(root, 'app') + path.sep;
const norm = (p) => (process.platform === 'linux' ? p : p.toLowerCase());
const hit = EDIT_TOOL.test(toolName) && paths(args).some((p) => norm(path.resolve(root, p) + path.sep).startsWith(norm(appDir)));

if (hit) {
  const reason = 'app/ is read-only for agents. Keep the failing test and report the app bug instead.';
  process.stdout.write(JSON.stringify({
    permissionDecision: 'deny',
    permissionDecisionReason: reason,
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
} else {
  process.stdout.write('{}');
}
