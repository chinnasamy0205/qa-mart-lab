#!/usr/bin/env node
// Minimal QA Mart MCP server: stdio, newline-delimited JSON-RPC, no dependencies (Node 18+).
// stdout = protocol only; logs go to stderr.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const BASE = (process.env.QAMART_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const REPORT = process.env.QAMART_REPORT || path.join(process.cwd(), 'reports', 'results.json');

const text = (v) => ({ content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }] });

async function http(method, route, body) {
  try {
    const res = await fetch(BASE + route, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  } catch (err) {
    throw new Error(`QA Mart not reachable at ${BASE}. Run "npm start". (${err.message})`);
  }
}

function* specs(suite) {
  for (const s of suite.specs || []) yield { s, file: suite.file };
  for (const c of suite.suites || []) yield* specs({ ...c, file: c.file || suite.file });
}

const TOOLS = [
  {
    name: 'qamart_health', description: 'Check that QA Mart is running.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => text((await http('GET', '/api/health')).data),
  },
  {
    name: 'qamart_validate_coupon', description: 'Validate a coupon code for a subtotal in rupees.',
    inputSchema: { type: 'object', required: ['code', 'subtotal'], properties: { code: { type: 'string' }, subtotal: { type: 'number' }, email: { type: 'string' } } },
    run: async (a) => {
      const r = await http('POST', '/api/coupons/validate', { code: a.code, subtotal: a.subtotal, email: a.email || 'asha@qamart.test' });
      return text({ httpStatus: r.status, ...r.data });
    },
  },
  {
    name: 'tests_list_failures', description: 'Failed tests from reports/results.json: file, line, title, first error line.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => {
      if (!fs.existsSync(REPORT)) throw new Error(`No report at ${REPORT}. Run "npm test" first.`);
      const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
      const out = [];
      for (const root of report.suites || []) {
        for (const { s, file } of specs(root)) {
          for (const t of s.tests || []) {
            const last = (t.results || []).slice(-1)[0] || {};
            if (last.status === 'failed' || last.status === 'timedOut') {
              const msg = String((last.error && last.error.message) || '').replace(/\u001b\[[0-9;]*m/g, '');
              out.push({ file, line: s.line, title: s.title, error: msg.split('\n')[0] });
            }
          }
        }
      }
      return text(out);
    },
  },
];

const send = (m) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...m }) + '\n');

async function handle({ id, method, params }) {
  const isReq = id !== undefined && id !== null;
  try {
    if (method === 'initialize') {
      return send({ id, result: { protocolVersion: (params && params.protocolVersion) || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'samy-qa-plugin', version: '1.0.0' } } });
    }
    if (method === 'ping') return send({ id, result: {} });
    if (method === 'tools/list') {
      return send({ id, result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } });
    }
    if (method === 'tools/call') {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) return send({ id, error: { code: -32602, message: `Unknown tool: ${params.name}` } });
      try { return send({ id, result: await tool.run(params.arguments || {}) }); }
      catch (err) { return send({ id, result: { content: [{ type: 'text', text: err.message }], isError: true } }); }
    }
    if (isReq) send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err) {
    console.error('[samy-qa-mcp]', err);
    if (isReq) send({ id, error: { code: -32603, message: err.message } });
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return send({ id: null, error: { code: -32700, message: 'Parse error' } }); }
  handle(msg);
});
rl.on('close', () => process.exit(0));
console.error(`[samy-qa-mcp] ready, app at ${BASE}`);
