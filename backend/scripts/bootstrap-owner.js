const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function bootstrapOwner() {
  try {
    await db.migrate();
    const email = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
    const name = String(process.env.SUPERADMIN_NAME || '').trim();
    if (!email || !name) throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_NAME are required');
    const existing = await db.get('SELECT id, is_superadmin FROM users WHERE email = ?', [email]);
    if (existing) {
      if (!Number(existing.is_superadmin)) throw new Error('Existing account is not an owner; refusing to elevate it automatically');
      console.log('Owner account already exists; credentials and academic records preserved.');
      return;
    }
    const password = String(process.env.SUPERADMIN_BOOTSTRAP_PASSWORD || '');
    if (password.length < 12) throw new Error('A bootstrap password of at least 12 characters is required for a new owner');
    await db.run(
      "INSERT INTO users (email, name, password, role, is_superadmin) VALUES (?, ?, ?, 'admin', 1)",
      [email, name, await bcrypt.hash(password, 12)]
    );
    console.log('Owner account created. No demo data was inserted.');
  } finally {
    await db.close();
  }
}

bootstrapOwner().catch(error => {
  console.error('Owner bootstrap failed:', error.message);
  process.exitCode = 1;
});
