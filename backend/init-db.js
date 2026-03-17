const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function initDatabase() {
  const dbPath = path.join(__dirname, 'database.db');
  const schemaPath = path.join(__dirname, 'database', 'schema.sql');

  // Delete existing database if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️  Removed existing database');
  }

  const db = new sqlite3.Database(dbPath);
  const schema = fs.readFileSync(schemaPath, 'utf8');

  return new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) {
        console.error('❌ Schema execution error:', err);
        reject(err);
      } else {
        console.log('✅ Database schema created successfully');
        db.close();
        resolve();
      }
    });
  });
}

initDatabase().catch(console.error);