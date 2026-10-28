#!/usr/bin/env node
// QA Mart MCP server: stdio, newline-delimited JSON-RPC, zero dependencies (Node 18+).
// Env: QAMART_URL (default http://127.0.0.1:3000), QAMART_REPORT (default <cwd>/reports/results.json),
//      QA_PASS (default Test@1234, used by qamart_place_order).
// stdout carries protocol messages only. Anything else goes to stderr.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const BASE = (process.env.QAMART_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const REPORT = process.env.QAMART_REPORT || path.join(process.cwd(), 'reports', 'results.json');
const PASSWORD = process.env.QA_PASS || 'Test@1234';
const PROTOCOL = '2024-11-05';

const log = (...a) => console.error('[qamart-mcp]', ...a);

async function http(method, route, { body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(BASE + route, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) });
  } catch (err) {
    throw new Error(`QA Mart is not reachable at ${BASE}. Start it with "npm start". (${err.message})`);
  }
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ---- test report helpers ----
const stripAnsi = (s) => String(s || '').replace(/\u001b\[[0-9;]*m/g, '');

function readReport() {
  if (!fs.existsSync(REPORT)) throw new Error(`No report at ${REPORT}. Run "npm test" first so the JSON reporter writes it.`);
  return JSON.parse(fs.readFileSync(REPORT, 'utf8'));
}

function* walkSpecs(suite, file) {
  const f = suite.file || file;
  for (const spec of suite.specs || []) yield { spec, file: f };
  for (const child of suite.suites || []) yield* walkSpecs(child, f);
}

function firstErrorLine(result) {
  const msg = stripAnsi((result.error && result.error.message) || (result.errors && result.errors[0] && result.errors[0].message) || '');
  const lines = msg.split('\n').map((l) => l.trim()).filter(Boolean);
  const expected = lines.find((l) => l.startsWith('Expected'));
  const received = lines.find((l) => l.startsWith('Received'));
  return [lines[0], expected, received].filter(Boolean).join(' | ');
}

function collect(report) {
  const entries = [];
  for (const root of report.suites || []) {
    for (const { spec, file } of walkSpecs(root, root.file)) {
      for (const t of spec.tests || []) {
        const results = t.results || [];
        const last = results[results.length - 1] || {};
        entries.push({
          key: `${file}::${spec.title}::${t.projectName}`,
          file, line: spec.line, title: spec.title, project: t.projectName,
          status: t.status, finalStatus: last.status, anyFailed: results.some((r) => r.status === 'failed' || r.status === 'timedOut'),
          error: last.status === 'failed' || last.status === 'timedOut' ? firstErrorLine(last) : '',
        });
      }
    }
  }
  return entries;
}

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });

// ---- tools ----
const TOOLS = [
  {
    name: 'qamart_health', description: 'Check that the QA Mart app is running.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => text((await http('GET', '/api/health')).data),
  },
  {
    name: 'qamart_list_products', description: 'List products with price and the per-order stock limit.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => {
      const [p, s] = await Promise.all([http('GET', '/api/products'), http('GET', '/api/inventory')]);
      return text(p.data.products.map((x) => ({ ...x, stock: s.data.stock[x.id] })));
    },
  },
  {
    name: 'qamart_validate_coupon', description: 'Validate a coupon code for a subtotal in rupees. Returns the HTTP status and QA Mart response.',
    inputSchema: { type: 'object', required: ['code', 'subtotal'], properties: { code: { type: 'string' }, subtotal: { type: 'number' }, email: { type: 'string', description: 'Shopper email; matters for WELCOME50' } } },
    run: async (a) => {
      const r = await http('POST', '/api/coupons/validate', { body: { code: a.code, subtotal: a.subtotal, email: a.email || 'asha@qamart.test' } });
      return text({ httpStatus: r.status, ...r.data });
    },
  },
  {
    name: 'qamart_place_order', description: 'Sign in as a lab account and place an order. Items are { id, qty }. Changes app state; use qamart_reset to clear it.',
    inputSchema: { type: 'object', required: ['email', 'items'], properties: { email: { type: 'string' }, coupon: { type: 'string' }, items: { type: 'array', items: { type: 'object', required: ['id', 'qty'], properties: { id: { type: 'string' }, qty: { type: 'integer' } } } } } },
    run: async (a) => {
      const login = await http('POST', '/api/login', { body: { email: a.email, password: PASSWORD } });
      if (login.status !== 200) return { ...text({ httpStatus: login.status, ...login.data }), isError: true };
      const r = await http('POST', '/api/orders', { body: { email: a.email, items: a.items, coupon: a.coupon }, token: login.data.token });
      return text({ httpStatus: r.status, ...r.data });
    },
  },
  {
    name: 'qamart_list_orders', description: 'List every order placed since the last reset (test-control API).',
    inputSchema: { type: 'object', properties: {} },
    run: async () => text((await http('GET', '/api/test/orders')).data),
  },
  {
    name: 'qamart_reset', description: 'Delete all orders and restart order numbers. Changes app state.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => text((await http('POST', '/api/test/reset')).data),
  },
  {
    name: 'tests_last_run_summary', description: 'Totals from the last Playwright run (reports/results.json).',
    inputSchema: { type: 'object', properties: {} },
    run: async () => {
      const r = readReport();
      return text({ report: REPORT, startTime: r.stats.startTime, durationMs: Math.round(r.stats.duration), passed: r.stats.expected, failed: r.stats.unexpected, flaky: r.stats.flaky, skipped: r.stats.skipped });
    },
  },
  {
    name: 'tests_list_failures', description: 'Failed tests from the last run: file, line, title, project and first error line.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => text(collect(readReport()).filter((e) => e.finalStatus === 'failed' || e.finalStatus === 'timedOut')
      .map(({ file, line, title, project, error }) => ({ file, line, title, project, error }))),
  },
  {
    name: 'tests_find_flaky', description: 'Tests that both passed and failed in the last run (retries or --repeat-each).',
    inputSchema: { type: 'object', properties: {} },
    run: async () => {
      const groups = new Map();
      for (const e of collect(readReport())) {
        const g = groups.get(e.key) || { file: e.file, line: e.line, title: e.title, project: e.project, runs: 0, failures: 0, flagged: false };
        g.runs += 1;
        if (e.finalStatus !== 'passed') g.failures += 1;
        if (e.status === 'flaky' || (e.anyFailed && e.finalStatus === 'passed')) g.flagged = true;
        groups.set(e.key, g);
      }
      const flaky = [...groups.values()].filter((g) => g.flagged || (g.failures > 0 && g.failures < g.runs));
      return text(flaky.map(({ flagged, ...g }) => g));
    },
  },
];

// ---- protocol ----
function send(msg) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n'); }

async function handle(msg) {
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;
  try {
    if (method === 'initialize') {
      return send({ id, result: { protocolVersion: (params && params.protocolVersion) || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: 'manojpandey-qamart-qa-toolkit', version: '1.0.0' } } });
    }
    if (method === 'ping') return send({ id, result: {} });
    if (method === 'tools/list') {
      return send({ id, result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } });
    }
    if (method === 'tools/call') {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) return send({ id, error: { code: -32602, message: `Unknown tool: ${params.name}` } });
      try {
        return send({ id, result: await tool.run(params.arguments || {}) });
      } catch (err) {
        return send({ id, result: { content: [{ type: 'text', text: err.message }], isError: true } });
      }
    }
    if (isRequest) return send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err) {
    log(err);
    if (isRequest) send({ id, error: { code: -32603, message: err.message } });
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
log(`ready, app at ${BASE}, report at ${REPORT}`);
