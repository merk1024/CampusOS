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
  process.env.MFA_ENCRYPTION_KEY = require('node:crypto').randomBytes(32).toString('base64');
  process.env.MFA_REQUIRE_ADMIN_ENROLLMENT = 'false';
  const db = require('../config/database');
  const seed = require('../seeds/seed');
  const { startServer } = require('../server');
  const { SUPERADMIN_EMAIL } = require('../utils/access');
  let server;
  try {
    const existing = await db.get("SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'");
    assert.equal(existing.count, 0, 'PostgreSQL security tests require a new empty disposable database');
    await seed();
    assert.ok(await db.get('SELECT version FROM schema_migrations WHERE version = ?', [db.schemaVersion]));
    assert.ok(await db.get('SELECT version FROM schema_migrations WHERE version = ?',
      ['2026-10-16-007-session-version']));
    assert.ok(await db.get("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'session_version'"));
    const firstCount = await db.get('SELECT COUNT(*)::int AS count FROM users');
    // Exercise migration of an existing database without losing users.
    await db.run('ALTER TABLE users DROP COLUMN session_version');
    await db.run('DELETE FROM schema_migrations WHERE version = ?', ['2026-10-16-007-session-version']);
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
    const alertActor = await db.get('SELECT id FROM users WHERE email = ?', ['teacher@alatoo.edu.kg']);
    for (let i = 0; i < 5; i++) {
      await db.run('INSERT INTO system_audit_log (entity_type, action, summary, changed_by) VALUES (?, ?, ?, ?)',
        ['security', 'login-failed', 'Postgres alert fixture', alertActor.id]);
    }
    for (const source of ['events', 'grades', 'attendance']) {
      const response = await fetch(base + '/api/ops/security-audit?source=' + source + '&from=2026-01-01&to=2099-12-31&limit=1', {
        headers: { Cookie: cookie }
      });
      assert.equal(response.status, 200);
      const audit = await response.json();
      const warning = audit.alerts.find(alert => alert.actorId === alertActor.id && alert.rule === 'failed-logins');
      assert.ok(warning);
      assert.equal(warning.count, 5);
      assert.ok(Number.isFinite(Date.parse(warning.lastSeen)));
      assert.equal(audit.source, source);
      assert.ok(audit.entries.length <= 1);
      for (const entry of audit.entries) {
        assert.ok(Number.isFinite(Date.parse(entry.occurredAt)));
        assert.ok(!Object.hasOwn(entry, 'details'));
      }
    }
    await db.run("DELETE FROM system_audit_log WHERE summary = 'Postgres alert fixture'");
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
    await require('./helpers/auditRemediation')({
      request, login: loginUser, db, authHeaders: token => ({ Authorization: `Bearer ${token}` })
    });
    await require('./helpers/mfaSecurity')({ request, db });
    await require('./helpers/auditIntegrity')(db);
  } finally {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await db.close();
  }
});
