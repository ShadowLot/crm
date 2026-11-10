// API tests using the built-in Node test runner.  Run with:  npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.DB_FILE = path.join(os.tmpdir(), `ct-test-${process.pid}.sqlite`);

const { default: app } = await import('../src/index.js');

let server, base;
before(async () => {
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(process.env.DB_FILE, { force: true }); });

// Tiny cookie-aware client so each "user" keeps its own session.
function client() {
  let cookie = '';
  return async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
}

const alice = client();
const bob = client();

test('health endpoint responds', async () => {
  const r = await alice('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true });
});

test('protected routes reject unauthenticated requests', async () => {
  const r = await alice('GET', '/api/customers');
  assert.equal(r.status, 401);
});

test('registration validates input', async () => {
  const r = await alice('POST', '/api/auth/register', { name: '', email: 'bad', password: '123' });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'Validation failed');
});

test('users can register and log in', async () => {
  let r = await alice('POST', '/api/auth/register', { name: 'Alice', email: 'alice@test.local', password: 'Password123' });
  assert.equal(r.status, 201);
  r = await bob('POST', '/api/auth/register', { name: 'Bob', email: 'bob@test.local', password: 'Password123' });
  assert.equal(r.status, 201);

  r = await alice('POST', '/api/auth/login', { email: 'alice@test.local', password: 'wrong-password' });
  assert.equal(r.status, 401);
  r = await alice('POST', '/api/auth/login', { email: 'alice@test.local', password: 'Password123' });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.name, 'Alice');
});

let customerId, saleId;

test('customer CRUD works', async () => {
  let r = await alice('POST', '/api/customers', { name: 'Test Co Lead', email: 'lead@testco.com', company: 'Test Co', status: 'lead' });
  assert.equal(r.status, 201);
  customerId = r.body.id;

  r = await alice('GET', '/api/customers?q=testco');
  assert.equal(r.body.length, 1);

  r = await alice('PUT', `/api/customers/${customerId}`, { name: 'Test Co Lead', status: 'customer' });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'customer');
});

test('customer validation rejects bad status and oversized names', async () => {
  let r = await alice('POST', '/api/customers', { name: 'X', status: 'vip' });
  assert.equal(r.status, 400);
  r = await alice('POST', '/api/customers', { name: 'x'.repeat(101) });
  assert.equal(r.status, 400);
});

test('sales are linked to owned customers and can change stage', async () => {
  let r = await alice('POST', '/api/sales', { customer_id: customerId, title: 'First sale', value: 5000, stage: 'new' });
  assert.equal(r.status, 201);
  saleId = r.body.id;

  r = await alice('PATCH', `/api/sales/${saleId}/stage`, { stage: 'won' });
  assert.equal(r.status, 200);
  assert.equal(r.body.stage, 'won');

  r = await alice('PATCH', `/api/sales/${saleId}/stage`, { stage: 'invalid' });
  assert.equal(r.status, 400);
});

test('another user cannot read, modify or delete someone else\'s records (IDOR)', async () => {
  let r = await bob('GET', `/api/customers/${customerId}`);
  assert.equal(r.status, 404);
  r = await bob('PUT', `/api/customers/${customerId}`, { name: 'Hijacked' });
  assert.equal(r.status, 404);
  r = await bob('DELETE', `/api/sales/${saleId}`);
  assert.equal(r.status, 404);
  r = await bob('POST', '/api/sales', { customer_id: customerId, title: 'Sneaky', value: 1 });
  assert.equal(r.status, 400);
});

test('dashboard aggregates the user\'s own data', async () => {
  const r = await alice('GET', '/api/dashboard');
  assert.equal(r.status, 200);
  assert.equal(r.body.totals.customers, 1);
  assert.equal(r.body.totals.wonValue, 5000);
});

test('activities can be created and toggled', async () => {
  let r = await alice('POST', '/api/activities', { customer_id: customerId, sale_id: saleId, type: 'call', subject: 'Intro call', due_date: '2026-12-01' });
  assert.equal(r.status, 201);
  r = await alice('PATCH', `/api/activities/${r.body.id}/toggle`);
  assert.equal(r.body.done, 1);
});

test('SQL-injection style input is treated as plain data', async () => {
  let r = await alice('POST', '/api/customers', { name: "Robert'); DROP TABLE customers;--" });
  assert.equal(r.status, 201);
  r = await alice('GET', "/api/customers?q=' OR 1=1 --");
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 0);
  r = await alice('GET', '/api/customers');
  assert.equal(r.body.length, 2);
});

test('malformed JSON returns 400, not a stack trace', async () => {
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad json' });
  assert.equal(res.status, 400);
});
