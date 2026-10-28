// postToolUse: warn (stderr) if an edited file looks like it contains a secret. Never blocks.
const fs = require('node:fs');
const path = require('node:path');

try {
  const event = JSON.parse(fs.readFileSync(0, 'utf8'));
  let args = event.toolArgs ?? event.tool_input ?? {};
  if (typeof args === 'string') args = JSON.parse(args);
  const file = args.path || args.filePath || args.file_path;
  if (file) {
    const full = path.resolve(event.cwd || process.cwd(), file);
    const body = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
    if (/(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"\s]{8,}['"]|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}/i.test(body)) {
      console.error(`[samy-qa-plugin] Possible secret in ${file}. Move it to an environment variable.`);
    }
  }
} catch { /* ignore */ }
process.stdout.write('{}');
