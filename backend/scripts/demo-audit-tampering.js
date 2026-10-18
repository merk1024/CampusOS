const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
if (process.argv.length !== 2) throw new Error('The demo accepts no database path or arguments');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-audit-demo-'));
Object.assign(process.env, { NODE_ENV: 'test', APP_ENV: 'test', DB_CLIENT: 'sqlite', SQLITE_DB_PATH: path.join(directory, 'demo.db') });
delete process.env.AUDIT_CHECKPOINT_PATH;
const db = require('../config/database');
const { logSystemAudit } = require('../utils/platformOps');
const { initializeAuditChain, verifyAuditChain } = require('../services/auditIntegrityService');
const { readTrustedCheckpoint, exportCheckpoint } = require('../security/auditCheckpoint');
const { auditDigest, chainDigest } = require('../security/auditDigest');
async function main() {
  await db.migrate();
  await logSystemAudit({ entityType: 'demo', action: 'example', summary: 'Original demo record' });
  await initializeAuditChain();
  const original = await db.get('SELECT * FROM system_audit_log LIMIT 1');
  const point = (await verifyAuditChain()).checkpoint;
  const file = path.join(directory, 'retained-checkpoint.json');
  await exportCheckpoint(file, point);
  const checkpoint = await readTrustedCheckpoint(file);
  const verify = async label => {
    const result = await verifyAuditChain({ checkpoint });
    console.log(`${label}: ${result.status}${result.reason ? ' (' + result.reason + ')' : ''}`);
    return result;
  };
  assert.equal((await verify('Original')).status, 'anchored-prefix-valid');
  await db.run('UPDATE system_audit_log SET summary = ? WHERE id = ?', ['Tampered demo record', original.id]);
  assert.equal((await verify('Edited record')).status, 'violation');
  // This intentionally simulates a database writer recomputing all stored hashes.
  const row = await db.get('SELECT * FROM system_audit_log WHERE id = ?', [original.id]);
  const payloadHash = auditDigest('system_audit_log', row);
  const hash = chainDigest({ chainId: point.chainId, sequence: 1, source: 'system_audit_log', recordId: row.id, payloadHash, previousHash: '0'.repeat(64) });
  await db.run('UPDATE audit_integrity_entries SET payload_hash = ?, entry_hash = ? WHERE sequence = 1', [payloadHash, hash]);
  await db.run('UPDATE audit_integrity_head SET head_hash = ? WHERE id = 1', [hash]);
  assert.equal((await verifyAuditChain()).status, 'unanchored');
  assert.equal((await verify('Recomputed database chain, retained checkpoint unchanged')).status, 'violation');
  await db.run('DELETE FROM system_audit_log WHERE id = ?', [original.id]);
  assert.equal((await verify('Deleted record')).status, 'violation');
  console.log('Disposable demonstration passed. No real database was accessed.');
}
main().catch(() => { console.error('Disposable audit demonstration failed'); process.exitCode = 1; }).finally(async () => {
  await db.close();
  const resolved = path.resolve(directory);
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('campusos-audit-demo-')) throw new Error('Unsafe cleanup path');
  fs.rmSync(resolved, { recursive: true, force: true });
});
