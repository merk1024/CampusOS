const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.all(
  "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  [],
  (error, rows) => {
    if (error) {
      console.error(`Failed to inspect SQLite database at ${dbPath}:`, error);
    } else {
      console.log(`SQLite database: ${dbPath}`);
      if (!rows.length) {
        console.log('No tables found.');
      } else {
        console.log('Tables:');
        rows.forEach((row) => console.log(` - ${row.name}`));
      }
    }

    db.close();
  }
);
