// Integer flags and epoch milliseconds have the same semantics in both adapters.
module.exports = [
  `CREATE TABLE IF NOT EXISTS mfa_factors (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    secret_encrypted TEXT,
    pending_secret_encrypted TEXT,
    pending_expires_at BIGINT,
    pending_attempts INTEGER NOT NULL DEFAULT 0 CHECK (pending_attempts >= 0 AND pending_attempts <= 5),
    last_used_step BIGINT NOT NULL DEFAULT -1,
    CHECK (enabled = 0 OR secret_encrypted IS NOT NULL)
  )`,
  `CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    PRIMARY KEY (user_id, code_hash)
  )`,
  `CREATE TABLE IF NOT EXISTS mfa_challenges (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('login', 'enrollment')),
    session_version INTEGER NOT NULL,
    role TEXT NOT NULL,
    remember_me INTEGER NOT NULL DEFAULT 0 CHECK (remember_me IN (0, 1)),
    expires_at BIGINT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
    consumed INTEGER NOT NULL DEFAULT 0 CHECK (consumed IN (0, 1))
  )`,
  'CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expiry ON mfa_challenges(expires_at)',
  'CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user ON mfa_challenges(user_id)'
];
