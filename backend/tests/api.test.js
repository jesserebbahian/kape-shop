process.env.NODE_ENV = 'test';
process.env.PAYMENT_PROVIDER = 'mock';
process.env.RATE_AUTH = '1000';
process.env.RATE_AI = '1000';
process.env.GEMINI_API_KEY = '';

import net from 'node:net';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const freePort = () =>
  new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

let memoryDb;
let memoryServer;

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
  const port = await freePort();
  memoryDb = await PGlite.create();
  memoryServer = new PGLiteSocketServer({ db: memoryDb, port, host: '127.0.0.1' });
  await memoryServer.start();
  process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
  process.env.DATABASE_SSL = 'false';
  process.env.DB_POOL_MAX = '1';
}

const { initDb } = await import('../src/models/index.js');
const { closeDb } = await import('../src/config/database.js');
const { createApp, env } = await import('../src/app.js');
const { seedAll } = await import('../scripts/seedData.js');
const { MockProvider } = await import('../src/patterns/MockProvider.js');

let server;
let base;
let adminToken;
let juanToken;
let mariaToken;
let batchId;

const call = async (method, path, { token, body, headers = {} } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
  });
  const json = res.status === 204 ? null : await res.json();
  return { status: res.status, json };
};

const login = async (email, password) => (await call('POST', '/api/v1/auth/login', { body: { email, password } })).json.data.token;

const fillCart = async (token, quantity = 1) => {
  const { json } = await call('GET', '/api/v1/cart', { token });
  for (const item of json.data.items) await call('DELETE', `/api/v1/cart/items/${item.cartItemId}`, { token });
  return call('POST', '/api/v1/cart/items', { token, body: { productId: 1, sizeG: 250, grind: 'whole_bean', quantity } });
};

const shipping = { shippingName: 'Juan Dela Cruz', shippingPhone: '09171234567', shippingAddress: '12 Rizal Street, Iloilo City' };

before(async () => {
  await initDb({ force: true });
  await seedAll({ withBatches: false });
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  adminToken = await login('admin@kape.test', 'Admin123!');
  juanToken = await login('juan@kape.test', 'Customer123!');
  mariaToken = await login('maria@kape.test', 'Customer123!');
  const batch = await call('POST', '/api/v1/admin/batches', {
    token: adminToken,
    body: { roastDate: '2099-01-10', cutoffAt: '2099-01-08T00:00:00.000Z', capacityUnits: 1 }
  });
  batchId = batch.json.data.id;
});

after(async () => {
  server.close();
  await closeDb();
  await memoryServer?.stop();
  await memoryDb?.close();
});

test('registration rejects duplicates and login rejects bad credentials', async () => {
  const first = await call('POST', '/api/v1/auth/register', { body: { email: 'new@kape.test', password: 'Customer123!', name: 'New Customer' } });
  assert.equal(first.status, 201);
  const dup = await call('POST', '/api/v1/auth/register', { body: { email: 'new@kape.test', password: 'Customer123!', name: 'New Customer' } });
  assert.equal(dup.status, 409);
  const bad = await call('POST', '/api/v1/auth/login', { body: { email: 'new@kape.test', password: 'wrong-password' } });
  assert.equal(bad.status, 401);
  assert.equal(bad.json.error.code, 'INVALID_CREDENTIALS');
});

test('role enforcement: no token is 401, customer token is 403 on admin routes', async () => {
  assert.equal((await call('GET', '/api/v1/admin/dashboard')).status, 401);
  assert.equal((await call('GET', '/api/v1/admin/dashboard', { token: juanToken })).status, 403);
  assert.equal((await call('GET', '/api/v1/admin/orders', { token: juanToken })).status, 403);
  assert.equal((await call('GET', '/api/v1/admin/dashboard', { token: adminToken })).status, 200);
});

test('server computes totals and rejects client-supplied prices', async () => {
  const added = await fillCart(juanToken, 1);
  assert.equal(added.status, 201);
  const quote = await call('POST', '/api/v1/checkout/quote', { token: juanToken, body: {} });
  assert.equal(quote.json.data.subtotalCents, 32000);
  assert.equal(quote.json.data.shippingCents, 10000);
  assert.equal(quote.json.data.totalCents, 42000);
  const res = await call('POST', '/api/v1/checkout', {
    token: juanToken,
    headers: { 'Idempotency-Key': 'price-test-0001' },
    body: { ...shipping, totalCents: 1, subtotalCents: 1 }
  });
  assert.equal(res.status, 422);
  assert.equal(res.json.error.code, 'VALIDATION_ERROR');
});

test('stock conflict: two simultaneous checkouts for the last unit give one success and one BATCH_FULL', async () => {
  await fillCart(juanToken, 1);
  await fillCart(mariaToken, 1);
  const [a, b] = await Promise.all([
    call('POST', '/api/v1/checkout', { token: juanToken, headers: { 'Idempotency-Key': 'race-juan-0001' }, body: shipping }),
    call('POST', '/api/v1/checkout', { token: mariaToken, headers: { 'Idempotency-Key': 'race-maria-0001' }, body: shipping })
  ]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, [201, 409]);
  const loser = a.status === 409 ? a : b;
  assert.equal(loser.json.error.code, 'BATCH_FULL');
  const winner = a.status === 201 ? a : b;
  assert.equal(winner.json.data.totalCents, 32000 + 10000);
  assert.equal(winner.json.data.status, 'pending_payment');
});

test('idempotency: repeating the same key returns the same order and creates no duplicate', async () => {
  const winnerToken = (await call('GET', '/api/v1/orders', { token: juanToken })).json.data.length ? juanToken : mariaToken;
  const key = winnerToken === juanToken ? 'race-juan-0001' : 'race-maria-0001';
  const before = (await call('GET', '/api/v1/orders', { token: winnerToken })).json.data;
  const again = await call('POST', '/api/v1/checkout', { token: winnerToken, headers: { 'Idempotency-Key': key }, body: shipping });
  assert.equal(again.status, 201);
  assert.equal(again.json.data.id, before[0].id);
  const after = (await call('GET', '/api/v1/orders', { token: winnerToken })).json.data;
  assert.equal(after.length, before.length);
});

test('Maya webhook rejects an invalid signature, then applies payment once and ignores replays', async (t) => {
  const ownerToken = (await call('GET', '/api/v1/orders', { token: juanToken })).json.data.length ? juanToken : mariaToken;
  const order = (await call('GET', '/api/v1/orders', { token: ownerToken })).json.data[0];
  const ref = order.paymentRef;
  const payload = JSON.stringify({ id: ref, paymentStatus: 'PAYMENT_SUCCESS' });

  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const originalKeys = env.maya.webhookPublicKeys;
  env.maya.webhookPublicKeys = [publicKey];
  t.after(() => { env.maya.webhookPublicKeys = originalKeys; });
  const nonce = '00112233445566778899aabbccddeeff';
  const signature = sign('RSA-SHA256', Buffer.from(`id=${ref}&paymentStatus=PAYMENT_SUCCESS&nonce=${nonce}`), privateKey).toString('hex');
  const headers = {
    'X-Maya-Webhook-Timestamp': String(Date.now()),
    'X-Maya-Webhook-Signature': `nonce=${nonce},v1=${signature}`
  };
  const bad = await call('POST', '/api/v1/webhooks/maya', { body: payload.replace('PAYMENT_SUCCESS', 'PAYMENT_FAILED'), headers });
  assert.equal(bad.status, 401);

  MockProvider.settle(ref, 'paid');
  const good = await call('POST', '/api/v1/webhooks/maya', { body: payload, headers });
  assert.equal(good.status, 200);
  assert.equal(good.json.data.result, 'processed');

  const replay = await call('POST', '/api/v1/webhooks/maya', { body: payload, headers });
  assert.equal(replay.json.data.result, 'duplicate');

  const detail = (await call('GET', `/api/v1/orders/${order.id}`, { token: ownerToken })).json.data;
  assert.equal(detail.status, 'paid');
  assert.equal(detail.history.filter((h) => h.to === 'paid').length, 1);
});

test('amount mismatch is flagged and the order is not marked paid', async () => {
  await call('POST', '/api/v1/admin/batches', { token: adminToken, body: { roastDate: '2099-02-10', cutoffAt: '2099-02-08T00:00:00.000Z', capacityUnits: 10 } });
  await fillCart(mariaToken, 1);
  const res = await call('POST', '/api/v1/checkout', { token: mariaToken, headers: { 'Idempotency-Key': 'mismatch-0001' }, body: shipping });
  assert.equal(res.status, 201);
  MockProvider.settle(res.json.data.paymentRef, 'paid', 100);
  const rec = await call('POST', `/api/v1/orders/${res.json.data.id}/reconcile`, { token: mariaToken });
  assert.equal(rec.json.data.outcome, 'flagged');
  assert.equal(rec.json.data.order.status, 'pending_payment');
  assert.equal(rec.json.data.order.flagged, true);
});

test('expired coupon returns 422 COUPON_EXPIRED and leaves the total unchanged', async () => {
  await fillCart(juanToken, 1);
  const plain = await call('POST', '/api/v1/checkout/quote', { token: juanToken, body: {} });
  const bad = await call('POST', '/api/v1/checkout/quote', { token: juanToken, body: { couponCode: 'EXPIRED20' } });
  assert.equal(bad.status, 422);
  assert.equal(bad.json.error.code, 'COUPON_EXPIRED');
  assert.equal(plain.json.data.totalCents, 42000);
});

test('AI discovery falls back to validated keyword results when the AI provider is unavailable', async () => {
  const res = await call('POST', '/api/v1/ai/discover', { body: { query: 'sweet barako for milk coffee' } });
  assert.equal(res.status, 200);
  assert.equal(res.json.data.source, 'keyword_fallback');
  assert.ok(res.json.data.picks.length > 0);
  for (const pick of res.json.data.picks) {
    const real = await call('GET', `/api/v1/products/${pick.product.id}`);
    assert.equal(real.json.data.name, pick.product.name);
  }
});

test('illegal order transition returns 409 and leaves history unchanged', async () => {
  const orders = (await call('GET', '/api/v1/admin/orders?status=pending_payment', { token: adminToken })).json.data;
  const pending = orders[0];
  const res = await call('PATCH', `/api/v1/admin/orders/${pending.id}/status`, { token: adminToken, body: { status: 'shipped' } });
  assert.equal(res.status, 409);
  assert.equal(res.json.error.code, 'ILLEGAL_TRANSITION');
});

test('Maya creates hosted checkout and verifies payments with the matching keys', async (t) => {
  const { env } = await import('../src/config/env.js');
  const { MayaProvider } = await import('../src/patterns/MayaProvider.js');
  const originalConfig = { ...env.maya };
  Object.assign(env.maya, {
    publicKey: 'pk-test',
    secretKey: 'sk-test',
    baseUrl: 'https://maya.example'
  });
  t.after(() => Object.assign(env.maya, originalConfig));

  const ref = '78e69cc8-8daf-4af3-a5b1-9ed5adb5e7c6';
  const checkoutUrl = 'https://checkout.example/session';
  const requests = t.mock.method(globalThis, 'fetch');
  requests.mock.mockImplementationOnce(async (url, options) => {
    assert.equal(url, 'https://maya.example/checkout/v1/checkouts');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Basic cGstdGVzdDo=');
    const payload = JSON.parse(options.body);
    assert.deepEqual(payload.totalAmount, { value: 420.5, currency: 'PHP' });
    assert.equal(payload.requestReferenceNumber.length, 36);
    return Response.json({ checkoutId: ref, redirectUrl: checkoutUrl });
  });
  requests.mock.mockImplementationOnce(async (url, options) => {
    assert.equal(url, `https://maya.example/payments/v1/payments/${ref}`);
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Basic c2stdGVzdDo=');
    return Response.json({ status: 'PAYMENT_SUCCESS', amount: '420.50', currency: 'PHP' });
  }, 1);
  requests.mock.mockImplementationOnce(async () => Response.json({ code: 'AUTH_ERROR' }, { status: 401 }), 2);

  const maya = new MayaProvider();
  const checkout = { totalCents: 42050, description: 'Kape order', urls: { success: 'https://shop.example/#/orders/1' } };
  assert.deepEqual(await maya.createCheckout(checkout), { ref, url: checkoutUrl });
  assert.deepEqual(await maya.retrieveCheckout(ref), { ref, status: 'paid', amountCents: 42050, currency: 'PHP' });
  await assert.rejects(maya.createCheckout(checkout), { code: 'PAYMENT_PROVIDER_ERROR', message: /credentials.*HTTP 401/ });
});

test('roast-to-order variant detail exposes server prices and cart uses two units for 500 g', async () => {
  const detail = await call('GET', '/api/v1/products/1');
  assert.equal(detail.status, 200);
  assert.equal(detail.json.data.priceTable['250'].whole_bean, 32000);
  assert.equal(detail.json.data.priceTable['500'].espresso, 63650);
  assert.ok(detail.json.data.remainingRoastUnits >= 2);

  await fillCart(juanToken, 1);
  const variant = await call('POST', '/api/v1/cart/items', {
    token: juanToken,
    body: { productId: 1, sizeG: 500, grind: 'espresso', quantity: 1 }
  });
  assert.equal(variant.status, 201);
  const line = variant.json.data.items.find((item) => item.sizeG === 500);
  assert.equal(line.units, 2);
  assert.equal(line.lineTotalCents, detail.json.data.priceTable['500'].espresso);
});

test('account and cart responses are marked no-store while the public catalog remains cacheable', async () => {
  const cart = await fetch(`${base}/api/v1/cart`, { headers: { Authorization: `Bearer ${juanToken}` } });
  assert.equal(cart.status, 200);
  assert.equal(cart.headers.get('Cache-Control'), 'no-store');
  const catalog = await fetch(`${base}/api/v1/products/1`);
  assert.equal(catalog.status, 200);
  assert.notEqual(catalog.headers.get('Cache-Control'), 'no-store');
});

test('a partial admin product update preserves other fields and visibility', async () => {
  const created = await call('POST', '/api/v1/admin/products', {
    token: adminToken,
    body: {
      name: 'QA Draft Coffee', category: 'Blend', origin: 'Iligan',
      roastLevel: 'medium', basePriceCents: 25000, active: false,
      description: 'Draft description', tastingNotes: 'Cocoa'
    }
  });
  assert.equal(created.status, 201);
  const changed = await call('PATCH', `/api/v1/admin/products/${created.json.data.id}`, {
    token: adminToken, body: { basePriceCents: 26000 }
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.json.data.basePriceCents, 26000);
  assert.equal(changed.json.data.active, false);
  assert.equal(changed.json.data.description, 'Draft description');
  assert.equal(changed.json.data.tastingNotes, 'Cocoa');
});
