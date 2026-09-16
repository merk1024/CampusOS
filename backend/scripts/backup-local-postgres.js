const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { randomBytes, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(root, 'backend/.env') });
const { Pool } = require('pg');

async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('This command only supports the local Compose database.');
  }
  const user = decodeURIComponent(url.username);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (user !== process.env.DB_USER || database !== process.env.DB_NAME) {
    throw new Error('DATABASE_URL must match the Compose DB_USER and DB_NAME.');
  }
  const compose = ['compose', '--env-file', 'backend/.env', 'exec', '-T', 'postgres'];
  const pool = new Pool({connectionString: url.toString(), ssl: false});
  let restored;
  let testDatabase;
  let testDatabaseCreated = false;
  try {
    const tableRows = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    if (!tableRows.rows.length) throw new Error('No tables to back up.');
    const snapshot = async (connection) => {
      const result = {};
      for (const {tablename} of tableRows.rows) {
        const quoted = '"' + tablename.replaceAll('"', '""') + '"';
        const rows = await connection.query('SELECT row_to_json(t)::text AS data FROM ' + quoted + ' t');
        result[tablename] = {
          count: rows.rowCount,
          hash: createHash('sha256').update(rows.rows.map(row => row.data).sort().join('\n')).digest('hex')
        };
      }
      return result;
    };
    const expected = await snapshot(pool);
    const dump = execFileSync('docker', [...compose, 'pg_dump', '-U', user, '-d', database, '--format=custom', '--no-owner', '--no-privileges'], {
      cwd: root, maxBuffer: 64 * 1024 * 1024, timeout: 120000
    });
    const output = path.join(root, 'backups', 'campusos-' + new Date().toISOString().replace(/[:.]/g, '-') + '.dump');
    fs.mkdirSync(path.dirname(output), {recursive:true});
    fs.writeFileSync(output, dump, {flag:'wx'});
    console.log('Backup created: ' + output);
    if (!process.argv.includes('--verify')) return;
    testDatabase = 'campusos_restore_' + randomBytes(8).toString('hex');
    await pool.query('CREATE DATABASE "' + testDatabase + '"');
    testDatabaseCreated = true;
    execFileSync('docker', [...compose, 'pg_restore', '-U', user, '-d', testDatabase, '--exit-on-error', '--no-owner', '--no-privileges'], {
      cwd:root, input:dump, timeout:120000, stdio:['pipe','pipe','pipe']
    });
    const testUrl = new URL(url);
    testUrl.pathname = '/' + testDatabase;
    restored = new Pool({connectionString:testUrl.toString(),ssl:false});
    const actual = await snapshot(restored);
    require('node:assert/strict').deepEqual(actual, expected);
    console.log('Restore verified: ' + tableRows.rows.length + ' tables; all row counts and content hashes match.');
  } finally {
    if (restored) await restored.end();
    // Only the randomly named database created by this command is removed.
    if (testDatabaseCreated) await pool.query('DROP DATABASE "' + testDatabase + '" WITH (FORCE)');
    await pool.end();
  }
}
main().catch(error => {
  console.error('Backup/verification failed:', error.message);
  process.exitCode = 1;
});
