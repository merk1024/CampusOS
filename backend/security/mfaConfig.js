const { validateMfaKey } = require('./mfaCrypto');

function requireAdminEnrollment() {
  const value = process.env.MFA_REQUIRE_ADMIN_ENROLLMENT;
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error('MFA_REQUIRE_ADMIN_ENROLLMENT must be true or false');
}

async function validateMfaStartup(db) {
  const enforce = requireAdminEnrollment();
  const row = await db.get('SELECT COUNT(*) AS count FROM mfa_factors WHERE enabled = 1 OR pending_secret_encrypted IS NOT NULL');
  if (enforce || process.env.MFA_ENCRYPTION_KEY || Number(row.count) > 0) validateMfaKey();
}

module.exports = { requireAdminEnrollment, validateMfaStartup };
