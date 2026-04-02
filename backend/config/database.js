const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database.db');
const SQLITE_SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');
const POSTGRES_SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.postgres.sql');

const USER_PROFILE_COLUMNS = [
  ['subgroup_name', 'TEXT'],
  ['date_of_birth', 'TEXT'],
  ['faculty', 'TEXT'],
  ['major', 'TEXT'],
  ['year_of_study', 'INTEGER'],
  ['address', 'TEXT'],
  ['emergency_contact', 'TEXT'],
  ['father_name', 'TEXT'],
  ['program_class', 'TEXT'],
  ['advisor', 'TEXT'],
  ['study_status', 'TEXT'],
  ['balance_info', 'TEXT'],
  ['grant_type', 'TEXT'],
  ['last_login_at', 'TEXT'],
  ['last_login_ip', 'TEXT'],
  ['registration_date', 'TEXT'],
  ['is_superadmin', 'INTEGER DEFAULT 0']
];

const SCHEDULE_COLUMNS = [
  ['audience_type', "TEXT DEFAULT 'group'"],
  ['subgroup_name', 'TEXT'],
  ['student_user_id', 'INTEGER'],
  ['course_id', 'INTEGER']
];

const SQLITE_AUDIT_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS grade_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grade_id INTEGER REFERENCES grades(id) ON DELETE SET NULL,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('created', 'updated')),
      previous_grade INTEGER,
      new_grade INTEGER,
      previous_comments TEXT,
      new_comments TEXT,
      changed_by INTEGER REFERENCES users(id),
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  'CREATE INDEX IF NOT EXISTS idx_grade_audit_student ON grade_audit_log(student_id)',
  `CREATE TABLE IF NOT EXISTS attendance_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_id INTEGER REFERENCES attendance(id) ON DELETE SET NULL,
      schedule_id INTEGER NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      date DATE NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('created', 'updated')),
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by INTEGER REFERENCES users(id),
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  'CREATE INDEX IF NOT EXISTS idx_attendance_audit_student ON attendance_audit_log(student_id)'
];

const POSTGRES_AUDIT_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS grade_audit_log (
      id SERIAL PRIMARY KEY,
      grade_id INTEGER REFERENCES grades(id) ON DELETE SET NULL,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('created', 'updated')),
      previous_grade INTEGER,
      new_grade INTEGER,
      previous_comments TEXT,
      new_comments TEXT,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
  'CREATE INDEX IF NOT EXISTS idx_grade_audit_student ON grade_audit_log(student_id)',
  `CREATE TABLE IF NOT EXISTS attendance_audit_log (
      id SERIAL PRIMARY KEY,
      attendance_id INTEGER REFERENCES attendance(id) ON DELETE SET NULL,
      schedule_id INTEGER NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      date DATE NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('created', 'updated')),
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
  'CREATE INDEX IF NOT EXISTS idx_attendance_audit_student ON attendance_audit_log(student_id)'
];

const SQLITE_PLATFORM_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS system_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      action TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT,
      changed_by INTEGER REFERENCES users(id),
      request_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  'CREATE INDEX IF NOT EXISTS idx_system_audit_created_at ON system_audit_log(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_system_audit_entity ON system_audit_log(entity_type, entity_id)',
  `CREATE TABLE IF NOT EXISTS notification_inbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('queued', 'delivered', 'failed', 'read')),
      metadata TEXT,
      is_read INTEGER DEFAULT 0,
      delivered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, source_type, source_id)
    )`,
  'CREATE INDEX IF NOT EXISTS idx_notification_inbox_user ON notification_inbox(user_id, is_read, created_at)',
  `CREATE TABLE IF NOT EXISTS job_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      payload TEXT NOT NULL,
      result_payload TEXT,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      worker_name TEXT,
      available_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      locked_at DATETIME,
      completed_at DATETIME,
      last_error TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  'CREATE INDEX IF NOT EXISTS idx_job_queue_status_available ON job_queue(status, available_at, created_at)'
];

const POSTGRES_PLATFORM_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS system_audit_log (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      action TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      request_id TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
  'CREATE INDEX IF NOT EXISTS idx_system_audit_created_at ON system_audit_log(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_system_audit_entity ON system_audit_log(entity_type, entity_id)',
  `CREATE TABLE IF NOT EXISTS notification_inbox (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('queued', 'delivered', 'failed', 'read')),
      metadata TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, source_type, source_id)
    )`,
  'CREATE INDEX IF NOT EXISTS idx_notification_inbox_user ON notification_inbox(user_id, is_read, created_at)',
  `CREATE TABLE IF NOT EXISTS job_queue (
      id SERIAL PRIMARY KEY,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      payload TEXT NOT NULL,
      result_payload TEXT,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      worker_name TEXT,
      available_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      locked_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      last_error TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
  'CREATE INDEX IF NOT EXISTS idx_job_queue_status_available ON job_queue(status, available_at, created_at)'
];

const SQLITE_MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

const POSTGRES_MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )
`;

const shouldUsePostgres = () => (
  String(process.env.DB_CLIENT || '').toLowerCase() === 'postgres'
  || Boolean(process.env.DATABASE_URL)
);

const convertQuestionParamsToDollarParams = (sql) => {
  let parameterIndex = 0;
  return sql.replace(/\?/g, () => {
    parameterIndex += 1;
    return `$${parameterIndex}`;
  });
};

const convertDollarParamsToQuestionParams = (sql) => (
  sql.replace(/\$\d+/g, '?')
);

const splitSqlStatements = (contents) => {
  const statements = [];
  let buffer = '';

  for (const line of contents.split(/\r?\n/)) {
    buffer += `${line}\n`;
    if (line.trim().endsWith(';')) {
      const statement = buffer.trim();
      if (statement) {
        statements.push(statement.replace(/;$/, ''));
      }
      buffer = '';
    }
  }

  const trailingStatement = buffer.trim();
  if (trailingStatement) {
    statements.push(trailingStatement);
  }

  return statements.filter(Boolean);
};

const normalizeScheduleAudienceTypes = async (db) => {
  await db.query(
    `UPDATE schedule
     SET audience_type = COALESCE(audience_type, 'group')
     WHERE audience_type IS NULL`
  );
};

const readBooleanEnv = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
};

const getPostgresSslSetting = () => {
  if (String(process.env.PGSSLMODE || '').toLowerCase() === 'disable') {
    return false;
  }

  if (String(process.env.NODE_ENV || '').toLowerCase() === 'development') {
    return false;
  }

  const explicitRejectUnauthorized = readBooleanEnv(process.env.PGSSL_REJECT_UNAUTHORIZED);
  if (explicitRejectUnauthorized !== null) {
    return { rejectUnauthorized: explicitRejectUnauthorized };
  }

  const allowSelfSigned = readBooleanEnv(process.env.PGSSL_ALLOW_SELF_SIGNED);
  if (allowSelfSigned === true) {
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: true };
};

const ensureSqliteColumns = async (adapter, tableName, columnSpecs) => {
  const columns = await adapter.all(`PRAGMA table_info(${tableName})`);
  const existingColumns = new Set(columns.map((column) => column.name));

  for (const [name, type] of columnSpecs) {
    if (!existingColumns.has(name)) {
      await adapter.run(`ALTER TABLE ${tableName} ADD COLUMN ${name} ${type}`);
    }
  }
};

const ensurePostgresColumns = async (adapter, tableName, columnSpecs) => {
  for (const [name, type] of columnSpecs) {
    await adapter.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${name} ${type}`);
  }
};

const getSqliteTableExists = async (adapter, tableName) => {
  const table = await adapter.get(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table' AND name = ?`,
    [tableName]
  );

  return Boolean(table);
};

const getPostgresTableExists = async (adapter, tableName) => {
  const table = await adapter.get(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ?`,
    [tableName]
  );

  return Boolean(table);
};

const getMigrationDefinitions = () => ([
  {
    version: '2026-04-02-001-baseline-schema',
    description: 'Bootstrap baseline schema on empty databases',
    async apply(context) {
      if (context.client === 'postgres') {
        await context.applySchemaFile();
        return;
      }

      const hasUsersTable = await context.tableExists('users');
      if (!hasUsersTable) {
        await context.applySchemaFile();
      }
    }
  },
  {
    version: '2026-04-02-002-user-profile-columns',
    description: 'Ensure extended user profile columns exist',
    async apply(context) {
      await context.ensureColumns('users', USER_PROFILE_COLUMNS);
    }
  },
  {
    version: '2026-04-02-003-schedule-columns',
    description: 'Ensure schedule audience and course columns exist',
    async apply(context) {
      await context.ensureColumns('schedule', SCHEDULE_COLUMNS);
      await normalizeScheduleAudienceTypes(context.adapter);
    }
  },
  {
    version: '2026-04-02-004-academic-audit-tables',
    description: 'Ensure grade and attendance audit tables exist',
    async apply(context) {
      await context.runStatements(
        context.client === 'postgres'
          ? POSTGRES_AUDIT_TABLE_STATEMENTS
          : SQLITE_AUDIT_TABLE_STATEMENTS
      );
    }
  },
  {
    version: '2026-04-02-005-platform-ops-tables',
    description: 'Ensure system audit, notification inbox, and job queue tables exist',
    async apply(context) {
      await context.runStatements(
        context.client === 'postgres'
          ? POSTGRES_PLATFORM_TABLE_STATEMENTS
          : SQLITE_PLATFORM_TABLE_STATEMENTS
      );
    }
  }
]);

const runVersionedMigrations = async (context) => {
  const migrationDefinitions = getMigrationDefinitions();

  await context.ensureMigrationTable();
  const appliedRows = await context.adapter.all(
    'SELECT version FROM schema_migrations ORDER BY applied_at ASC, version ASC'
  );
  const appliedVersions = new Set(appliedRows.map((row) => row.version));

  for (const migration of migrationDefinitions) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    await migration.apply(context);
    await context.adapter.query(
      'INSERT INTO schema_migrations (version, description) VALUES (?, ?)',
      [migration.version, migration.description]
    );
  }

  const currentMigration = migrationDefinitions[migrationDefinitions.length - 1];
  return {
    currentVersion: currentMigration.version,
    appliedCount: migrationDefinitions.length
  };
};

const createSqliteAdapter = () => {
  const sqlite3 = require('sqlite3').verbose();
  const sqlite = new sqlite3.Database(SQLITE_DB_PATH, (error) => {
    if (error) {
      console.error('Error opening SQLite database:', error.message);
      process.exit(1);
    }
    console.log('SQLite database connected successfully');
  });

  sqlite.run('PRAGMA foreign_keys = ON');

  const execSqlite = (sql) => (
    new Promise((resolve, reject) => {
      sqlite.exec(sql, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    })
  );

  const adapter = {
    client: 'sqlite',
    schemaVersion: null,

    run(sql, params = []) {
      const normalizedSql = convertDollarParamsToQuestionParams(sql);
      return new Promise((resolve, reject) => {
        sqlite.run(normalizedSql, params, function onRun(error) {
          if (error) {
            reject(error);
            return;
          }

          resolve({ id: this.lastID, changes: this.changes });
        });
      });
    },

    get(sql, params = []) {
      const normalizedSql = convertDollarParamsToQuestionParams(sql);
      return new Promise((resolve, reject) => {
        sqlite.get(normalizedSql, params, (error, row) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(row);
        });
      });
    },

    all(sql, params = []) {
      const normalizedSql = convertDollarParamsToQuestionParams(sql);
      return new Promise((resolve, reject) => {
        sqlite.all(normalizedSql, params, (error, rows) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(rows);
        });
      });
    },

    async query(sql, params = []) {
      const normalizedSql = convertDollarParamsToQuestionParams(sql);
      const isReadQuery = /^\s*(select|pragma)/i.test(normalizedSql);
      const hasReturning = /\breturning\b/i.test(normalizedSql);

      if (isReadQuery || hasReturning) {
        const rows = await adapter.all(normalizedSql, params);
        return { rows, rowCount: rows.length };
      }

      const result = await adapter.run(normalizedSql, params);
      return { rows: [], rowCount: result.changes };
    }
  };

  let migrationPromise;

  adapter.migrate = async () => {
    if (!migrationPromise) {
      migrationPromise = (async () => {
        const migrationStatus = await runVersionedMigrations({
          client: 'sqlite',
          adapter,
          tableExists: (tableName) => getSqliteTableExists(adapter, tableName),
          ensureColumns: (tableName, columnSpecs) => ensureSqliteColumns(adapter, tableName, columnSpecs),
          ensureMigrationTable: () => adapter.run(SQLITE_MIGRATION_TABLE_SQL),
          applySchemaFile: async () => {
            const schemaContents = fs.readFileSync(SQLITE_SCHEMA_PATH, 'utf8');
            await execSqlite(schemaContents);
          },
          runStatements: async (statements) => {
            for (const statement of statements) {
              await adapter.run(statement);
            }
          }
        });

        adapter.schemaVersion = migrationStatus.currentVersion;
        return migrationStatus;
      })().catch((error) => {
        migrationPromise = null;
        throw error;
      });
    }

    return migrationPromise;
  };

  return adapter;
};

const createPostgresAdapter = () => {
  const sslSetting = getPostgresSslSetting();

  const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: sslSetting
      })
    : new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME || 'alatoo_lms',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: sslSetting
      });

  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error);
  });

  const adapter = {
    client: 'postgres',
    schemaVersion: null,

    async run(sql, params = []) {
      let normalizedSql = convertQuestionParamsToDollarParams(sql);
      const isInsert = /^\s*insert\b/i.test(normalizedSql);
      const hasReturning = /\breturning\b/i.test(normalizedSql);

      if (isInsert && !hasReturning) {
        normalizedSql = `${normalizedSql.trim()} RETURNING id`;
      }

      const result = await pool.query(normalizedSql, params);
      return {
        id: result.rows[0]?.id ?? null,
        changes: result.rowCount
      };
    },

    async get(sql, params = []) {
      const normalizedSql = convertQuestionParamsToDollarParams(sql);
      const result = await pool.query(normalizedSql, params);
      return result.rows[0];
    },

    async all(sql, params = []) {
      const normalizedSql = convertQuestionParamsToDollarParams(sql);
      const result = await pool.query(normalizedSql, params);
      return result.rows;
    },

    async query(sql, params = []) {
      const normalizedSql = sql.includes('?') ? convertQuestionParamsToDollarParams(sql) : sql;
      return pool.query(normalizedSql, params);
    }
  };

  let migrationPromise;

  adapter.migrate = async () => {
    if (!migrationPromise) {
      migrationPromise = (async () => {
        const migrationStatus = await runVersionedMigrations({
          client: 'postgres',
          adapter,
          tableExists: (tableName) => getPostgresTableExists(adapter, tableName),
          ensureColumns: (tableName, columnSpecs) => ensurePostgresColumns(adapter, tableName, columnSpecs),
          ensureMigrationTable: () => adapter.run(POSTGRES_MIGRATION_TABLE_SQL),
          applySchemaFile: async () => {
            const schemaContents = fs.readFileSync(POSTGRES_SCHEMA_PATH, 'utf8');
            const statements = splitSqlStatements(schemaContents);
            for (const statement of statements) {
              await adapter.query(statement);
            }
          },
          runStatements: async (statements) => {
            for (const statement of statements) {
              await adapter.query(statement);
            }
          }
        });

        adapter.schemaVersion = migrationStatus.currentVersion;
        return migrationStatus;
      })().catch((error) => {
        migrationPromise = null;
        throw error;
      });
    }

    return migrationPromise;
  };

  return adapter;
};

module.exports = shouldUsePostgres()
  ? createPostgresAdapter()
  : createSqliteAdapter();
