#!/usr/bin/env node
// Summarise a Playwright JSON report: one line per failed test, then totals.
// Usage: node summarize-report.cjs [path to results.json]  (default: reports/results.json)
const fs = require('node:fs');

const file = process.argv[2] || 'reports/results.json';
if (!fs.existsSync(file)) {
  console.error(`No report at ${file}. Run "npm test" first.`);
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const strip = (s) => String(s || '').replace(/\u001b\[[0-9;]*m/g, '');

function* specs(suite, parentFile) {
  const f = suite.file || parentFile;
  for (const spec of suite.specs || []) yield { spec, file: f };
  for (const child of suite.suites || []) yield* specs(child, f);
}

function reason(result) {
  const message = strip((result.error && result.error.message) || '');
  const lines = message.split('\n').map((l) => l.trim()).filter(Boolean);
  const detail = lines.filter((l) => l.startsWith('Expected') || l.startsWith('Received'));
  return [lines[0], ...detail].filter(Boolean).join(' | ');
}

// A test is flaky when it both passed and failed in this run (retries or --repeat-each),
// which Playwright's own stats.flaky does not count for --repeat-each.
const runs = new Map();
let failures = 0;
for (const root of report.suites || []) {
  for (const { spec, file } of specs(root, root.file)) {
    for (const test of spec.tests || []) {
      const results = test.results || [];
      const last = results[results.length - 1];
      // Same file, line and title: repeats of one test (--repeat-each gives each repeat its own spec.id),
      // while data-driven cases declared on one line keep distinct titles.
      const key = `${file}:${spec.line}:${spec.title}:${test.projectName}`;
      const seen = runs.get(key) || { passed: false, failed: false };
      for (const r of results) { if (r.status === 'passed') seen.passed = true; else if (r.status === 'failed' || r.status === 'timedOut') seen.failed = true; }
      runs.set(key, seen);
      if (!last || (last.status !== 'failed' && last.status !== 'timedOut')) continue;
      failures += 1;
      console.log(`FAILED  ${file}:${spec.line}  [${test.projectName}]  ${spec.title}`);
      console.log(`        ${reason(last)}`);
    }
  }
}

const s = report.stats || {};
const flaky = [...runs.values()].filter((r) => r.passed && r.failed).length;
console.log(`\n${failures} failed, ${s.expected ?? '?'} passed, ${flaky} flaky, ${s.skipped ?? 0} skipped`);
process.exit(failures ? 1 : 0);
