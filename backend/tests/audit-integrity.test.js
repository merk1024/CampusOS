const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-audit-'));
Object.assign(process.env, { NODE_ENV: 'test', DB_CLIENT: 'sqlite', SQLITE_DB_PATH: path.join(temp, 'demo.db'),
  SUPERADMIN_BOOTSTRAP_PASSWORD: 'AuditOwnerTest123!', SEED_ADMIN_PASSWORD: 'AuditAdminTest123!',
  SEED_TEACHER_PASSWORD: 'AuditTeacherTest123!', SEED_STUDENT_PASSWORD: 'AuditStudentTest123!' });
const db = require('../config/database');
test.after(async () => { await db.close(); fs.rmSync(temp, { recursive: true, force: true }); });
test('audit chain detects tampering, serializes writers and retains deleted-entity history', async () => {
  await require('../seeds/seed')();
  await require('./helpers/auditIntegrity')(db);
});
test('supplied unsupported audit executors cannot redirect writes to the singleton', async () => {
  const before = Number((await db.get('SELECT COUNT(*) AS count FROM system_audit_log')).count);
  const { appendAuditRecord } = require('../services/auditIntegrityService');
  await assert.rejects(appendAuditRecord('system_audit_log', 'INSERT INTO system_audit_log (entity_type, action, summary) VALUES (?, ?, ?)',
    ['test', 'executor', 'Must not reach singleton'], { run: async () => { throw new Error('injected executor'); } }), /Unsupported audit executor/);
  assert.equal(Number((await db.get('SELECT COUNT(*) AS count FROM system_audit_log')).count), before);
});
