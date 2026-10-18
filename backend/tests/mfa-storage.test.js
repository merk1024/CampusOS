const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-mfa-'));
process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = path.join(temp, 'test.db');
process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
process.env.SUPERADMIN_BOOTSTRAP_PASSWORD = 'OwnerMfaStorageTest123!';
process.env.SEED_ADMIN_PASSWORD = 'AdminMfaStorageTest123!';
process.env.SEED_TEACHER_PASSWORD = 'TeacherMfaStorageTest123!';
process.env.SEED_STUDENT_PASSWORD = 'StudentMfaStorageTest123!';
const db = require('../config/database');
const seed = require('../seeds/seed');

test.after(async () => { await db.close(); fs.rmSync(temp, { recursive: true, force: true }); });
test('MFA migration is idempotent, constrains tokens and seed preserves active factors', async () => {
  await seed();
  const user = await db.get('SELECT id FROM users WHERE email = ?', ['admin@alatoo.edu.kg']);
  const { encryptSecret } = require('../security/mfaCrypto');
  const encrypted = encryptSecret('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', user.id);
  await db.run('INSERT INTO mfa_factors (user_id, secret_encrypted, enabled) VALUES (?, ?, ?)', [user.id, encrypted, 1]);
  await db.run('INSERT INTO mfa_recovery_codes (user_id, code_hash) VALUES (?, ?)', [user.id, 'hash']);
  await assert.rejects(db.run('INSERT INTO mfa_recovery_codes (user_id, code_hash) VALUES (?, ?)', [user.id, 'hash']));
  await db.run('INSERT INTO mfa_challenges (token_hash, user_id, purpose, session_version, role, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['challenge-hash', user.id, 'login', 0, 'admin', Date.now() + 300000]);
  await assert.rejects(db.run('INSERT INTO mfa_challenges (token_hash, user_id, purpose, session_version, role, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['invalid', user.id, 'unrestricted', 0, 'admin', Date.now() + 300000]));
  await db.migrate();
  await seed();
  const factor = await db.get('SELECT * FROM mfa_factors WHERE user_id = ?', [user.id]);
  assert.equal(factor.secret_encrypted, encrypted);
  assert.equal(factor.enabled, 1);
  assert.ok(await db.get('SELECT version FROM schema_migrations WHERE version = ?', ['2026-10-18-008-administrator-mfa']));
  const { validateMfaStartup } = require('../security/mfaConfig');
  await validateMfaStartup(db);
  delete process.env.MFA_ENCRYPTION_KEY;
  await assert.rejects(validateMfaStartup(db), /MFA_ENCRYPTION_KEY/);
});
