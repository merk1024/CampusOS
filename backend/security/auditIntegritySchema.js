const { FIELDS } = require('./auditDigest');
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS audit_integrity_head (
    id INTEGER PRIMARY KEY CHECK (id = 1), initialized INTEGER NOT NULL DEFAULT 0 CHECK (initialized IN (0,1)),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version = 1), chain_id TEXT, sequence BIGINT NOT NULL DEFAULT 0,
    head_hash TEXT NOT NULL, initialized_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS audit_integrity_entries (
    sequence BIGINT PRIMARY KEY, source TEXT NOT NULL CHECK (source IN ('system_audit_log','grade_audit_log','attendance_audit_log')),
    record_id INTEGER NOT NULL, payload_hash TEXT NOT NULL, previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL,
    UNIQUE (source, record_id)
  )`,
  `INSERT INTO audit_integrity_head (id, head_hash) VALUES (1, '${'0'.repeat(64)}') ON CONFLICT (id) DO NOTHING`
];

async function migrateAuditIntegrity(context) {
  await context.adapter.transaction(async tx => {
    for (const source of Object.keys(FIELDS)) {
      if (context.client === 'postgres') {
        const constraints = await tx.all(`SELECT conname FROM pg_constraint WHERE conrelid = ?::regclass AND contype = 'f'`, [source]);
        for (const row of constraints) await tx.query(`ALTER TABLE ${source} DROP CONSTRAINT "${row.conname.replace(/"/g, '""')}"`);
      } else {
        const allocation = await tx.get('SELECT seq FROM sqlite_sequence WHERE name = ?', [source]);
        const columns = await tx.all(`PRAGMA table_info(${source})`);
        if (columns.length !== FIELDS[source].length || columns.some(column => !FIELDS[source].includes(column.name))) throw new Error('Unexpected audit schema; migration requires review');
        const definitions = columns.map(column => column.name === 'id' ? 'id INTEGER PRIMARY KEY AUTOINCREMENT'
          : `${column.name} ${column.type || 'TEXT'}${column.notnull ? ' NOT NULL' : ''}${column.dflt_value ? ' DEFAULT ' + column.dflt_value : ''}`);
        if (source !== 'system_audit_log') definitions.push("CHECK (action IN ('created','updated'))");
        await tx.run(`CREATE TABLE ${source}_retained (${definitions.join(', ')})`);
        const names = FIELDS[source].join(', ');
        await tx.run(`INSERT INTO ${source}_retained (${names}) SELECT ${names} FROM ${source}`);
        await tx.run(`DROP TABLE ${source}`);
        await tx.run(`ALTER TABLE ${source}_retained RENAME TO ${source}`);
        if (allocation) {
          const restored = await tx.run('UPDATE sqlite_sequence SET seq = CASE WHEN seq < ? THEN ? ELSE seq END WHERE name = ?', [allocation.seq, allocation.seq, source]);
          if (!restored.changes) await tx.run('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)', [source, allocation.seq]);
        }
      }
    }
    for (const sql of [
      'CREATE INDEX IF NOT EXISTS idx_grade_audit_student ON grade_audit_log(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_audit_student ON attendance_audit_log(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_system_audit_created_at ON system_audit_log(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_system_audit_entity ON system_audit_log(entity_type, entity_id)', ...SCHEMA
    ]) await tx.run(sql);
  });
}
module.exports = { migrateAuditIntegrity };
