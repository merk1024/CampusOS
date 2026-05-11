const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(__dirname, 'database.db');
const schemaPath = path.join(__dirname, 'database', 'schema.sql');

async function initDatabase() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`Removed existing SQLite database: ${dbPath}`);
  }

  const db = new sqlite3.Database(dbPath);
  const schema = fs.readFileSync(schemaPath, 'utf8');

  return new Promise((resolve, reject) => {
    db.exec(schema, (error) => {
      if (error) {
        console.error('Schema execution error:', error);
        db.close(() => reject(error));
        return;
      }

      db.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        console.log(`SQLite schema created successfully at ${dbPath}`);
        resolve();
      });
    });
  });
}

initDatabase().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
