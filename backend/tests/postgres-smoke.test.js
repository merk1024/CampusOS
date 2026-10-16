const assert = require('node:assert/strict');
const test = require('node:test');

test('PostgreSQL migrations, seed and authenticated API', {
  skip: !process.env.TEST_DATABASE_URL
}, async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_CLIENT = 'postgres';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.PGSSLMODE = 'disable';
  process.env.JWT_SECRET = 'postgres-integration-test-secret';
  process.env.SUPERADMIN_BOOTSTRAP_PASSWORD = 'PostgresTestOwner123!';
  process.env.SEED_ADMIN_PASSWORD = 'PostgresTestAdmin123!';
  process.env.SEED_TEACHER_PASSWORD = 'PostgresTestTeacher123!';
  process.env.SEED_STUDENT_PASSWORD = 'PostgresTestStudent123!';
  const db = require('../config/database');
  const seed = require('../seeds/seed');
  const { startServer } = require('../server');
  const { SUPERADMIN_EMAIL } = require('../utils/access');
  let server;
  try {
    await seed();
    assert.ok(await db.get('SELECT version FROM schema_migrations WHERE version = ?', [db.schemaVersion]));
    assert.ok(await db.get('SELECT version FROM schema_migrations WHERE version = ?',
      ['2026-10-16-007-session-version']));
    assert.ok(await db.get("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'session_version'"));
    const firstCount = await db.get('SELECT COUNT(*)::int AS count FROM users');
    const { execFileSync } = require('node:child_process');
    execFileSync(process.execPath, [require('node:path').join(__dirname, '..', 'init-db.js')], {
      env: process.env,
      timeout: 30000
    });
    const secondCount = await db.get('SELECT COUNT(*)::int AS count FROM users');
    assert.equal(firstCount.count, secondCount.count);
    assert.ok(firstCount.count > 0);
    server = await startServer(0);
    const base = 'http://127.0.0.1:' + server.address().port;
    const ready = await fetch(base + '/ready');
    assert.equal(ready.status, 200);
    assert.equal((await ready.json()).database.client, 'postgres');
    const login = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: SUPERADMIN_EMAIL, password: process.env.SUPERADMIN_BOOTSTRAP_PASSWORD })
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    for (const route of ['/api/auth/me', '/api/courses', '/api/schedule', '/api/exams']) {
      const response = await fetch(base + route, { headers: { Cookie: cookie } });
      assert.equal(response.status, 200, route + ': ' + await response.text());
    }
    const tables = await db.get("SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'");
    assert.ok(tables.count >= 10);
    const request = async (route, options = {}) => {
      const response = await fetch(base + route, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
      return { response, body: await response.json() };
    };
    const loginUser = async (login, password) => {
      const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) });
      assert.equal(result.response.status, 200);
      return result.body;
    };
    await require('./helpers/academicAccess')({
      request, login: loginUser, db, authHeaders: token => ({ Authorization: `Bearer ${token}` })
    });
    await require('./helpers/contentSecurity')({
      request, login: loginUser, db, authHeaders: token => ({ Authorization: `Bearer ${token}` })
    });
  } finally {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await db.close();
  }
});
