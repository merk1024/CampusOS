const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const USER_PROFILE_COLUMNS = [
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

// Create database path
const dbPath = path.join(__dirname, '..', 'database.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected successfully');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Promisify for async/await
const dbAsync = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

let migrationPromise;

dbAsync.migrate = async () => {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const columns = await dbAsync.all('PRAGMA table_info(users)');
      const existingColumns = new Set(columns.map((column) => column.name));

      for (const [name, type] of USER_PROFILE_COLUMNS) {
        if (!existingColumns.has(name)) {
          await dbAsync.run(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
        }
      }

      await dbAsync.run(
        `UPDATE users
         SET date_of_birth = COALESCE(date_of_birth, '2005-12-25'),
             faculty = COALESCE(faculty, 'Faculty of Engineering and Informatics'),
             major = COALESCE(major, 'Cybersecurity and Ethical Hacking'),
             year_of_study = COALESCE(year_of_study, 3),
             father_name = COALESCE(father_name, 'Iliiaz'),
             program_class = COALESCE(program_class, 'Киберкоопсуздук жана этикалык хакердик - Бкл.-EN - 3'),
             advisor = COALESCE(advisor, 'Нурайым Кулетова'),
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
    })().catch((error) => {
      migrationPromise = null;
      throw error;
    });
  }

  return migrationPromise;
};

module.exports = dbAsync;
