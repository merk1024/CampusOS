const db = require('./config/database');
async function main() {
  try {
    const tables = await db.all(db.client === 'postgres'
      ? "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
      : "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    console.log('Database: ' + db.client + '; tables: ' + tables.length);
    tables.forEach(({name}) => console.log(' - ' + name));
    if (!tables.some(({name}) => name === 'schema_migrations')) {
      throw new Error('Schema not initialized. Run npm run db:init.');
    }
    const migrations = await db.all('SELECT version FROM schema_migrations ORDER BY version');
    console.log('Applied migrations: ' + migrations.length);
  } finally {
    await db.close();
  }
}
main().catch(error => {
  console.error('Database check failed:', error.message);
  process.exitCode = 1;
});
