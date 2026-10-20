const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = ':memory:';
process.env.JWT_SECRET = 'login-audit-test-secret';
process.env.TRUST_PROXY = 'false';
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { app, startServer } = require('../server');
let server;
let base;
const password = 'LoginAuditTest123!';
const login = (body, headers = {}) => fetch(base + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
});
before(async () => {
  await db.migrate();
  const hash = await bcrypt.hash(password, 4);
  await db.run('INSERT INTO users (email,password,name,role) VALUES (?,?,?,?)', ['audit@example.test', hash, 'Audit', 'student']);
  server = await startServer(0);
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await db.close();
});
test('untrusted forwarding headers cannot replace the recorded login address', async () => {
  app.set('trust proxy', false);
  const response = await login({ login: 'audit@example.test', password }, { 'X-Forwarded-For': '203.0.113.123, 198.51.100.10', 'X-Real-IP': '192.0.2.99' });
  assert.equal(response.status, 200);
  const user = await db.get('SELECT last_login_ip FROM users');
  assert.match(user.last_login_ip, /^(::ffff:)?127\.0\.0\.1$/);
  const event = await db.get("SELECT details FROM system_audit_log WHERE action='login' ORDER BY id DESC LIMIT 1");
  assert.equal(JSON.parse(event.details).loginIp, user.last_login_ip);
});
test('one trusted proxy uses the nearest forwarded address, not the attacker-controlled first entry', async () => {
  app.set('trust proxy', 1);
  try {
    assert.equal((await login({ login: 'audit@example.test', password }, { 'X-Forwarded-For': '203.0.113.123, 198.51.100.10' })).status, 200);
    assert.equal((await db.get('SELECT last_login_ip FROM users')).last_login_ip, '198.51.100.10');
  } finally { app.set('trust proxy', false); }
});
test('rejected credentials and invalid input create bounded audit events without submitted secrets', async () => {
  const cases = [
    { body: { login: 'unknown-login-secret', password: 'unknown-password-secret' }, status: 401, reason: 'invalid_credentials' },
    { body: { login: 'audit@example.test', password: 'wrong-password-secret' }, status: 401, reason: 'invalid_credentials' },
    { body: { login: 'audit@example.test', password: { secret: 'malformed-password-secret' } }, status: 400, reason: 'invalid_request' }
  ];
  for (const item of cases) {
    assert.equal((await login(item.body, { 'X-Request-Id': 'login-audit-probe' })).status, item.status);
    const event = await db.get('SELECT * FROM system_audit_log ORDER BY id DESC LIMIT 1');
    assert.equal(event.action, 'login-failed');
    assert.equal(event.entity_type, 'auth');
    assert.equal(event.changed_by, null);
    assert.equal(event.request_id, 'login-audit-probe');
    assert.deepEqual(Object.keys(JSON.parse(event.details)).sort(), ['loginIp', 'reason']);
    assert.equal(JSON.parse(event.details).reason, item.reason);
    assert.ok(!JSON.stringify(event).includes('password-secret'));
    assert.ok(!JSON.stringify(event).includes('unknown-login-secret'));
  }
  await db.run('UPDATE users SET is_active = 0');
  assert.equal((await login({ login: 'audit@example.test', password })).status, 403);
  const event = await db.get('SELECT * FROM system_audit_log ORDER BY id DESC LIMIT 1');
  assert.equal(event.action, 'login-failed');
  assert.equal(JSON.parse(event.details).reason, 'account_disabled');
  assert.equal(event.changed_by, null);
  await db.run('UPDATE users SET is_active = 1');
  assert.equal((await login({ login: 'audit@example.test', password })).status, 200);
});
