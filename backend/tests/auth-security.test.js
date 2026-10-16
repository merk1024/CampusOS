const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-security-'));
process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = path.join(tempDir, 'security.db');
process.env.JWT_SECRET = 'isolated-security-test-secret';
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const express = require('express');
const { validatePassword } = require('../utils/passwordPolicy');
let server;
let baseUrl;
const password = 'SecurityTest123!';
const request = async (route, method = 'GET', body, token) => {
  const response = await fetch(baseUrl + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
};
const login = async email => {
  const result = await request('/auth/login', 'POST', { login: email, password });
  assert.equal(result.status, 200);
  return result.body.token;
};

test.before(async () => {
  await db.migrate();
  const hash = await bcrypt.hash(password, 4);
  for (const [email, role, superadmin] of [['student@test.local', 'student', 0], ['admin@test.local', 'admin', 0], ['owner@test.local', 'admin', 1]]) {
    await db.run('INSERT INTO users (email, password, name, role, is_superadmin, group_name, faculty, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [email, hash, 'Original Name', role, superadmin, 'Original Group', 'Original Faculty', '123']);
  }
  const app = express();
  app.use(express.json());
  app.use('/auth', require('../routes/auth'));
  app.use('/users', require('../routes/users'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('password policy checks character and UTF-8 byte boundaries', () => {
  assert.throws(() => validatePassword('short'));
  assert.throws(() => validatePassword(123456789012));
  assert.equal(validatePassword('a'.repeat(72)), true);
  assert.throws(() => validatePassword('a'.repeat(73)));
  assert.equal(validatePassword('\u00e9'.repeat(36)), true);
  assert.throws(() => validatePassword('\u00e9'.repeat(37)));
});

test('self updates preserve omitted personal and protected fields on both routes', async () => {
  const token = await login('student@test.local');
  const student = await db.get('SELECT id FROM users WHERE email = ?', ['student@test.local']);
  for (const route of ['/users/profile/me', `/users/${student.id}`]) {
    const result = await request(route, 'PUT', { name: 'New Name', group_name: 'Forged', faculty: 'Forged', balance_info: 'Forged', is_active: false }, token);
    assert.equal(result.status, 200);
    assert.equal(result.body.user.name, 'New Name');
    assert.equal(result.body.user.phone, '123');
    assert.equal(result.body.user.group_name, 'Original Group');
    assert.equal(result.body.user.faculty, 'Original Faculty');
    assert.equal(result.body.user.balance_info, null);
    assert.equal(result.body.user.is_active, 1);
  }
});

test('regular admin cannot create admins singly or through either bulk endpoint', async () => {
  const token = await login('admin@test.local');
  assert.equal((await request('/users', 'POST', { name: 'Forbidden', email: 'forbidden@test.local', role: 'admin', password }, token)).status, 403);
  for (const route of ['/users/bulk/preview', '/users/bulk/apply']) {
    assert.equal((await request(route, 'POST', { csvText: `name,email,role,password\nForbidden,bulk@test.local,admin,${password}` }, token)).status, 403);
  }
  assert.equal(await db.get('SELECT id FROM users WHERE email = ?', ['bulk@test.local']), undefined);
});

test('logout and password changes invalidate all previously issued tokens', async () => {
  const first = await login('student@test.local');
  const second = await login('student@test.local');
  assert.equal((await request('/auth/logout', 'POST', {}, first)).status, 200);
  for (const token of [first, second]) assert.equal((await request('/auth/me', 'GET', undefined, token)).status, 401);
  const fresh = await login('student@test.local');
  assert.equal((await request('/auth/password', 'PUT', { currentPassword: password, newPassword: 'short' }, fresh)).status, 400);
  assert.equal((await request('/auth/password', 'PUT', { currentPassword: password, newPassword: 'Replacement123!' }, fresh)).status, 200);
  assert.equal((await request('/auth/me', 'GET', undefined, fresh)).status, 401);
});

test('SQLite transaction queries work and exclude ordinary writes; rollback is atomic', async () => {
  await db.run('CREATE TABLE transaction_probe (id INTEGER PRIMARY KEY, value TEXT)');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let entered;
  const started = new Promise(resolve => { entered = resolve; });
  const transaction = db.transaction(async tx => {
    assert.equal(tx.client, 'sqlite');
    await tx.query('INSERT INTO transaction_probe VALUES (?, ?)', [1, 'transaction']);
    assert.equal((await tx.query('SELECT * FROM transaction_probe')).rows.length, 1);
    entered();
    await gate;
    assert.equal((await tx.all('SELECT * FROM transaction_probe')).length, 1);
  });
  await started;
  let outsideFinished = false;
  const outside = db.run('INSERT INTO transaction_probe VALUES (?, ?)', [2, 'outside']).then(() => { outsideFinished = true; });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(outsideFinished, false);
  release();
  await Promise.all([transaction, outside]);
  await assert.rejects(db.transaction(async tx => {
    await tx.run('INSERT INTO transaction_probe VALUES (?, ?)', [3, 'rollback']);
    throw new Error('rollback probe');
  }), /rollback probe/);
  assert.equal(await db.get('SELECT * FROM transaction_probe WHERE id = 3'), undefined);
  assert.equal((await db.query('SELECT * FROM transaction_probe')).rowCount, 2);
});
