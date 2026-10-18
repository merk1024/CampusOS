const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-audit-retention-'));
Object.assign(process.env, { DB_CLIENT: 'sqlite', SQLITE_DB_PATH: path.join(directory, 'test.db') });
const db = require('../config/database');
test.after(async () => { await db.close(); fs.rmSync(directory, { recursive: true, force: true }); });
test('retention migration preserves SQLite allocation history even after the highest ID was deleted', async () => {
  await db.migrate();
  await db.run("INSERT INTO system_audit_log (id, entity_type, action, summary) VALUES (1000, 'test', 'legacy', 'Deleted high ID')");
  await db.run('DELETE FROM system_audit_log WHERE id = 1000');
  await require('../security/auditIntegritySchema').migrateAuditIntegrity({ adapter: db, client: 'sqlite' });
  const inserted = await db.run("INSERT INTO system_audit_log (entity_type, action, summary) VALUES ('test', 'next', 'Next ID')");
  assert.ok(inserted.id > 1000);
});
