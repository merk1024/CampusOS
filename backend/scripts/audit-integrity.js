const path = require('node:path');
const fs = require('node:fs');
const { exportCheckpoint } = require('../security/auditCheckpoint');
let db;
async function main() {
  const [command, argument] = process.argv.slice(2);
  if (!['init', 'verify', 'export'].includes(command)) throw new Error('Usage: audit-integrity.js init --confirm-baseline | verify | export ABSOLUTE_NEW_FILE');
  if (command === 'init' && argument !== '--confirm-baseline') throw new Error('Explicit --confirm-baseline is required');
  if (command === 'export' && (!argument || !path.isAbsolute(argument))) throw new Error('Explicit absolute export destination is required');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const client = process.env.DB_CLIENT || (process.env.DATABASE_URL ? 'postgres' : 'sqlite');
  if (client === 'sqlite' && !fs.existsSync(process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database.db'))) throw new Error('Existing migrated database is required');
  db = require('../config/database');
  const migration = await db.get('SELECT version FROM schema_migrations WHERE version = ?', ['2026-10-18-009-audit-integrity']);
  if (!migration) throw new Error('Apply reviewed migrations explicitly before audit operations');
  const { initializeAuditChain, verifyConfiguredAuditChain } = require('../services/auditIntegrityService');
  if (command === 'init') {
    if (argument !== '--confirm-baseline') throw new Error('Explicit --confirm-baseline is required');
    console.log(JSON.stringify(await initializeAuditChain()));
    return;
  }
  const result = await verifyConfiguredAuditChain();
  if (command === 'export') {
    if (!argument || !path.isAbsolute(argument)) throw new Error('Explicit absolute export destination is required');
    if (!['unanchored', 'anchored-prefix-valid'].includes(result.status)) throw new Error('Export refused: audit verification did not pass');
    await exportCheckpoint(argument, result.checkpoint);
    console.log(JSON.stringify({ status: 'exported', sequence: result.checkpoint.sequence, independentRetentionRequired: true }));
  } else {
    const { checkpoint, ...publicResult } = result;
    void checkpoint;
    console.log(JSON.stringify(publicResult));
    if (!['unanchored', 'anchored-prefix-valid'].includes(result.status)) process.exitCode = 2;
  }
}
main().catch(() => { console.error('Audit integrity operation failed; no reference was replaced. Check configuration, migrations and command arguments.'); process.exitCode = 1; }).finally(() => db?.close());
