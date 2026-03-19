const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const SQLITE_DB_PATH = path.join(__dirname, '..', 'database.db');
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
  ['registration_date', 'TEXT']
];

const SCHEDULE_COLUMNS = [
  ['audience_type', "TEXT DEFAULT 'group'"],
  ['subgroup_name', 'TEXT'],
  ['student_user_id', 'INTEGER']
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

const applyDemoStudentDefaults = async (db) => {
  await db.query(
    `UPDATE schedule
     SET audience_type = COALESCE(audience_type, 'group')
     WHERE audience_type IS NULL`
  );

  await db.query(
    `UPDATE users
     SET subgroup_name = CASE
           WHEN subgroup_name IS NULL AND group_name = 'CYB-23' THEN '1-Group'
           ELSE subgroup_name
         END,
         date_of_birth = COALESCE(date_of_birth, '2005-12-25'),
         faculty = COALESCE(faculty, 'Faculty of Engineering and Informatics'),
         major = COALESCE(major, 'Cybersecurity and Ethical Hacking'),
         year_of_study = COALESCE(year_of_study, 3),
         father_name = COALESCE(father_name, 'Iliiaz'),
         program_class = COALESCE(program_class, 'Cybersecurity and Ethical Hacking - Bcl.-EN - 3'),
         advisor = COALESCE(advisor, 'Nuraiym Kuletova'),
         study_status = COALESCE(study_status, 'Studying'),
         balance_info = COALESCE(balance_info, 'No debt [ 1.33 USD advance payment ]'),
         grant_type = COALESCE(grant_type, 'Not available'),
         registration_date = COALESCE(registration_date, '2024-08-15'),
         email = CASE WHEN email = 'student@alatoo.edu.kg' THEN 'erbol.abdusaitov1@alatoo.edu.kg' ELSE email END,
         student_id = CASE WHEN role = 'student' AND student_id = '240145121' THEN '240141052' ELSE student_id END,
         name = CASE WHEN role = 'student' AND name = 'Azamat Bekzhanov' THEN 'Erbol Abdusaitov' ELSE name END,
         group_name = CASE WHEN role = 'student' AND group_name = 'COMSE-25' THEN 'CYB-23' ELSE group_name END,
         avatar = CASE WHEN role = 'student' AND (avatar IS NULL OR avatar = 'AB') THEN 'EA' ELSE avatar END
     WHERE role = 'student'`
  );
};

const createSqliteAdapter = () => {
  const sqlite = new sqlite3.Database(SQLITE_DB_PATH, (error) => {
    if (error) {
      console.error('Error opening SQLite database:', error.message);
      process.exit(1);
    }
    console.log('SQLite database connected successfully');
  });

  sqlite.run('PRAGMA foreign_keys = ON');

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

        await applyDemoStudentDefaults(adapter);
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

        await applyDemoStudentDefaults(adapter);
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
