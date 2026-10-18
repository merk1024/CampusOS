const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
test('verify refuses pending migrations instead of silently applying them', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-audit-cli-'));
  const options = { cwd: path.join(__dirname, '..'), env: { ...process.env, NODE_ENV: 'test', DB_CLIENT: 'sqlite', SQLITE_DB_PATH: path.join(directory, 'test.db'), AUDIT_CHECKPOINT_PATH: '' }, encoding: 'utf8', timeout: 30000 };
  try {
    const setup = spawnSync(process.execPath, ['-e', `const db=require('./config/database'); (async()=>{await db.migrate();await db.run("DELETE FROM schema_migrations WHERE version = '2026-10-18-009-audit-integrity'");await db.close();})().catch(()=>process.exit(1));`], options);
    assert.equal(setup.status, 0);
    const verification = spawnSync(process.execPath, ['scripts/audit-integrity.js', 'verify'], options);
    assert.equal(verification.status, 1);
    const inspection = spawnSync(process.execPath, ['-e', `const db=require('./config/database');db.get("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = '2026-10-18-009-audit-integrity'").then(row=>console.log('COUNT='+row.count)).finally(()=>db.close());`], options);
    assert.match(inspection.stdout, /COUNT=0/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
