// QA Mart: sample shop for the Day 3 Playwright lab.
// Zero dependencies. Needs Node 20 or newer. Start with: npm start
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
// Loopback only, so the reset endpoints are never reachable from other machines.
const HOST = process.env.QAMART_HOST || '127.0.0.1';
// /api/test/* helps tests and tools reset or inspect state. Set QAMART_TEST_API=0 to switch it off.
const TEST_API = process.env.QAMART_TEST_API !== '0';
const PUBLIC_DIR = path.join(__dirname, 'public');
// Products load with a random delay so hard waits become flaky (on purpose).
const DELAY_MIN = Number(process.env.PRODUCTS_DELAY_MIN ?? 300);
const DELAY_MAX = Number(process.env.PRODUCTS_DELAY_MAX ?? 1700);

const USERS = {
  'asha@qamart.test': { password: 'Test@1234', name: 'Asha Rao', firstOrder: true },
  'ravi@qamart.test': { password: 'Test@1234', name: 'Ravi Kumar', firstOrder: false },
  'locked@qamart.test': { password: 'Test@1234', name: 'Locked User', locked: true },
};

const PRODUCTS = [
  { id: 'p1', name: 'Wireless Mouse', price: 799 },
  { id: 'p2', name: 'USB-C Cable', price: 249 },
  { id: 'p3', name: 'Test Charter Notebook', price: 500 },
  { id: 'p4', name: 'Desk Lamp', price: 1499 },
  { id: 'p5', name: 'Coffee Mug', price: 350 },
  { id: 'p6', name: 'Laptop Stand', price: 1999 },
];

// Units available per order. Kept apart from /api/products so that response stays unchanged.
const INVENTORY = { p1: 10, p2: 25, p3: 5, p4: 3, p5: 40, p6: 0 };

const orders = [];
const sessions = new Map(); // token -> email

// US-101 coupon rules (see docs/stories/US-101-coupon-story.md).
function validateCoupon(rawCode, subtotal, email) {
  const code = String(rawCode ?? '').trim().toUpperCase();
  const user = USERS[email];
  if (!code) return { valid: false, message: 'Enter a coupon code' };
  if (code === 'SUMMER25') return { valid: false, message: 'This coupon has expired' };
  if (code === 'SAVE10') {
    const discount = Math.min(Math.floor(subtotal * 0.1), 200);
    return { valid: true, code, discount, message: 'SAVE10 applied: 10% off (max ₹200)' };
  }
  if (code === 'FLAT100') {
    // PLANTED BUG for the lab: the story says "₹500 or more", so this should be >=.
    if (subtotal >= 500) return { valid: true, code, discount: 100, message: 'FLAT100 applied: ₹100 off' };
    return { valid: false, message: 'FLAT100 needs an order of ₹500 or more' };
  }
  if (code === 'WELCOME50') {
    if (!user || !user.firstOrder) return { valid: false, message: 'WELCOME50 is for your first order only' };
    const discount = Math.min(Math.floor(subtotal * 0.5), 250);
    return { valid: true, code, discount, message: 'WELCOME50 applied: 50% off (max ₹250)' };
  }
  return { valid: false, message: 'Invalid coupon code' };
}

let nextOrder = 10001;

function bearerEmail(req) {
  const m = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  return m ? sessions.get(m[1]) : undefined;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve(null); } });
  });
}

function subtotalOf(items) {
  let total = 0;
  for (const { id, qty } of items) {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p || !Number.isInteger(qty) || qty < 1) return null;
    total += p.price * qty;
  }
  return total;
}

const ROUTES = { '/login': 'login.html', '/products': 'products.html', '/cart': 'cart.html', '/checkout': 'checkout.html', '/confirmation': 'confirmation.html', '/orders': 'orders.html' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

// UI version: v1 (default) or v2 "redesign". Set with ?ui=v2 (sticks via cookie)
// or the x-qamart-ui: v2 header, which the ui-v2 Playwright project sends.
function uiVersion(req, url) {
  const q = url.searchParams.get('ui');
  if (q === 'v1' || q === 'v2') return q;
  if (req.headers['x-qamart-ui'] === 'v2') return 'v2';
  return /(?:^|;\s*)qm_ui=v2/.test(req.headers.cookie || '') ? 'v2' : 'v1';
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;

  if (p.startsWith('/api/')) {
    if (req.method === 'GET' && p === '/api/health') return sendJson(res, 200, { status: 'ok' });
    if (req.method === 'GET' && p === '/api/inventory') return sendJson(res, 200, { stock: INVENTORY });
    if (req.method === 'GET' && p === '/api/orders') {
      const email = bearerEmail(req);
      if (!email) return sendJson(res, 401, { error: 'Sign in to see your orders' });
      return sendJson(res, 200, { orders: orders.filter((o) => o.email === email).reverse() });
    }
    if (TEST_API && req.method === 'GET' && p === '/api/test/orders') return sendJson(res, 200, { orders });
    if (req.method === 'GET' && p === '/api/products') {
      const delay = DELAY_MIN + Math.random() * Math.max(0, DELAY_MAX - DELAY_MIN);
      return setTimeout(() => sendJson(res, 200, { products: PRODUCTS }), delay);
    }
    if (req.method !== 'POST') return sendJson(res, 404, { error: 'Not found' });
    const body = await readBody(req);
    if (body === null) return sendJson(res, 400, { error: 'Body must be JSON' });
    if (p === '/api/login') {
      const email = String(body.email || '').trim().toLowerCase();
      const user = USERS[email];
      if (!user || user.password !== body.password) return sendJson(res, 401, { error: 'Invalid email or password' });
      if (user.locked) return sendJson(res, 423, { error: 'This account is locked. Contact support.' });
      const token = 'qm-' + crypto.randomUUID();
      sessions.set(token, email);
      return sendJson(res, 200, { email, name: user.name, token });
    }
    if (TEST_API && p === '/api/test/reset') {
      orders.length = 0;
      nextOrder = 10001;
      return sendJson(res, 200, { status: 'reset' });
    }
    if (p === '/api/coupons/validate') {
      const subtotal = Number(body.subtotal);
      if (!Number.isFinite(subtotal) || subtotal < 0) return sendJson(res, 400, { error: 'subtotal must be a number' });
      const result = validateCoupon(body.code, subtotal, body.email);
      return sendJson(res, result.valid ? 200 : 422, result);
    }
    if (p === '/api/orders') {
      const items = Array.isArray(body.items) ? body.items : [];
      const subtotal = items.length ? subtotalOf(items) : null;
      if (subtotal === null) return sendJson(res, 400, { error: 'Cart is empty or has an unknown item' });
      for (const { id } of items) {
        if (INVENTORY[id] === 0) return sendJson(res, 422, { error: `${PRODUCTS.find((x) => x.id === id).name} is out of stock` });
      }
      let discount = 0;
      let code = '';
      if (body.coupon) {
        const c = validateCoupon(body.coupon, subtotal, body.email);
        if (!c.valid) return sendJson(res, 422, { error: c.message });
        discount = c.discount;
        code = c.code;
      }
      const order = { orderId: 'QM-' + nextOrder++, email: String(body.email || '').trim().toLowerCase(), items, coupon: code, subtotal, discount, total: subtotal - discount, createdAt: new Date().toISOString() };
      orders.push(order);
      return sendJson(res, 201, { orderId: order.orderId, subtotal, discount, total: order.total });
    }
    return sendJson(res, 404, { error: 'Not found' });
  }

  if (p === '/') { res.writeHead(302, { Location: '/login' + url.search }); return res.end(); }
  const mapped = ROUTES[p] || p.slice(1);
  const file = path.normalize(path.join(PUBLIC_DIR, mapped));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found');
  }
  const ext = path.extname(file);
  const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' };
  if (ext === '.html') {
    const ui = uiVersion(req, url);
    if (url.searchParams.has('ui')) headers['Set-Cookie'] = `qm_ui=${ui}; Path=/; SameSite=Lax`;
    const html = fs.readFileSync(file, 'utf8').replace('<html lang="en">', `<html lang="en" data-ui="${ui}">`);
    res.writeHead(200, headers); return res.end(html);
  }
  res.writeHead(200, headers); fs.createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => console.log(`QA Mart running at http://localhost:${PORT}  (Ctrl+C to stop)`));
