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
        const usersTable = await adapter.get(
          `SELECT name
           FROM sqlite_master
           WHERE type = 'table' AND name = 'users'`
        );

        if (!usersTable) {
          const schemaContents = fs.readFileSync(SQLITE_SCHEMA_PATH, 'utf8');
          await execSqlite(schemaContents);
        }

        const columns = await adapter.all('PRAGMA table_info(users)');
        const existingColumns = new Set(columns.map((column) => column.name));

        for (const [name, type] of USER_PROFILE_COLUMNS) {
          if (!existingColumns.has(name)) {
            await adapter.run(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
          }
        }

        const scheduleColumns = await adapter.all('PRAGMA table_info(schedule)');
        const existingScheduleColumns = new Set(scheduleColumns.map((column) => column.name));

        for (const [name, type] of SCHEDULE_COLUMNS) {
          if (!existingScheduleColumns.has(name)) {
            await adapter.run(`ALTER TABLE schedule ADD COLUMN ${name} ${type}`);
          }
        }

        for (const statement of SQLITE_AUDIT_TABLE_STATEMENTS) {
          await adapter.run(statement);
        }

        await normalizeScheduleAudienceTypes(adapter);
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
  const sslSetting = process.env.PGSSLMODE === 'disable'
    ? false
    : (String(process.env.NODE_ENV).toLowerCase() === 'development' ? false : { rejectUnauthorized: false });

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
        const schemaContents = fs.readFileSync(POSTGRES_SCHEMA_PATH, 'utf8');
        const statements = splitSqlStatements(schemaContents);

        for (const statement of statements) {
          await pool.query(statement);
        }

        for (const [name, type] of USER_PROFILE_COLUMNS) {
          await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${name} ${type}`);
        }

        for (const [name, type] of SCHEDULE_COLUMNS) {
          await pool.query(`ALTER TABLE schedule ADD COLUMN IF NOT EXISTS ${name} ${type}`);
        }

        for (const statement of POSTGRES_AUDIT_TABLE_STATEMENTS) {
          await pool.query(statement);
        }

        await normalizeScheduleAudienceTypes(adapter);
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
