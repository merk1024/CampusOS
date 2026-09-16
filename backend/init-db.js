const db = require('./config/database');
async function main() {
  try {
    const status = await db.migrate();
    console.log(db.client + ': schema ready (' + status.currentVersion + '). Existing data preserved.');
  } finally {
    await db.close();
  }
}
main().catch(error => {
  console.error('Database initialization failed:', error.message);
  process.exitCode = 1;
});
