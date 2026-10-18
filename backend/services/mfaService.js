const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const crypto = require('../security/mfaCrypto');
const { requireAdminEnrollment } = require('../security/mfaConfig');
const { hasAdminAccess, hasSuperadminAccess: isSuperadmin } = require('../utils/access');
const { logSystemAudit } = require('../utils/platformOps');

const lifetime = 300000;
const fail = (status = 401, error = 'Invalid or expired MFA proof') => ({ status, error });
const admin = user => user && user.is_active && hasAdminAccess(user);
async function lockUser(tx, id) {
  await tx.run('UPDATE users SET session_version = session_version WHERE id = ?', [id]);
  return tx.get('SELECT * FROM users WHERE id = ?', [id]);
}
const audit = (tx, user, action, requestId, target) => logSystemAudit({ entityType: 'auth', entityId: target ?? user.id,
  action, summary: `MFA ${action}`, changedBy: user.id, requestId }, tx);

async function createLoginChallenge(user, rememberMe) {
  let factor = await db.get('SELECT enabled FROM mfa_factors WHERE user_id = ?', [user.id]);
  if (!hasAdminAccess(user) || (!Number(factor?.enabled) && !requireAdminEnrollment())) return null;
  crypto.validateMfaKey();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + lifetime;
  const result = await db.transaction(async tx => {
    const current = await lockUser(tx, user.id);
    if (!admin(current) || Number(current.session_version) !== Number(user.session_version)) throw new Error('Account changed during login');
    await tx.run('DELETE FROM mfa_challenges WHERE expires_at < ? OR (user_id = ? AND consumed = 1)', [Date.now(), user.id]);
    factor = await tx.get('SELECT enabled FROM mfa_factors WHERE user_id = ?', [user.id]);
    const outstanding = await tx.get('SELECT COUNT(*) AS count FROM mfa_challenges WHERE user_id = ?', [user.id]);
    if (Number(outstanding.count) >= 10) return fail(429, 'Too many MFA challenges. Try again later.');
    await tx.run('INSERT INTO mfa_challenges (token_hash, user_id, purpose, session_version, role, remember_me, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [crypto.hashOpaqueToken(token), user.id, Number(factor?.enabled) ? 'login' : 'enrollment', user.session_version, user.role, rememberMe ? 1 : 0, expiresAt]);
  });
  if (result?.error) return result;
  return { mfaRequired: Boolean(Number(factor?.enabled)), enrollmentRequired: !Number(factor?.enabled), challenge: token, expiresAt };
}

async function challengeActor(tx, token, purpose) {
  if (typeof token !== 'string' || token.length > 100) return null;
  const challenge = await tx.get('SELECT * FROM mfa_challenges WHERE token_hash = ?', [crypto.hashOpaqueToken(token)]);
  if (!challenge) return null;
  const user = await lockUser(tx, challenge.user_id);
  const fresh = await tx.get('SELECT * FROM mfa_challenges WHERE token_hash = ?', [challenge.token_hash]);
  if (!admin(user) || !fresh || fresh.purpose !== purpose || Number(fresh.consumed) || Number(fresh.attempts) >= 5
    || Number(fresh.expires_at) <= Date.now() || Number(fresh.session_version) !== Number(user.session_version) || fresh.role !== user.role) return null;
  return { user, challenge: fresh };
}

async function consumeFactor(tx, user, input) {
  const factor = await tx.get('SELECT * FROM mfa_factors WHERE user_id = ?', [user.id]);
  if (!Number(factor?.enabled)) return false;
  crypto.validateMfaKey();
  if (typeof input.recoveryCode === 'string' && /^[a-f0-9]{32}$/.test(input.recoveryCode) && !input.code) {
    const result = await tx.run('DELETE FROM mfa_recovery_codes WHERE user_id = ? AND code_hash = ?',
      [user.id, crypto.hashOpaqueToken(input.recoveryCode)]);
    return result.changes === 1 ? 'recovery' : false;
  }
  if (input.recoveryCode) return false;
  const step = await crypto.verifyTotp(crypto.decryptSecret(factor.secret_encrypted, user.id), input.code);
  if (step === null || step <= Number(factor.last_used_step)) return false;
  const result = await tx.run('UPDATE mfa_factors SET last_used_step = ? WHERE user_id = ? AND last_used_step < ?', [step, user.id, step]);
  return result.changes === 1 ? 'totp' : false;
}

async function verifyLoginChallenge(input, requestId) {
  return db.transaction(async tx => {
    const actor = await challengeActor(tx, input.challenge, 'login');
    if (!actor) {
      await logSystemAudit({ entityType: 'auth', action: 'mfa-failed', summary: 'Invalid or expired MFA challenge rejected', requestId }, tx);
      return fail();
    }
    const { user, challenge } = actor;
    await tx.run('UPDATE mfa_challenges SET attempts = attempts + 1 WHERE token_hash = ?', [challenge.token_hash]);
    const method = await consumeFactor(tx, user, input);
    if (!method) { await audit(tx, user, 'mfa-failed', requestId); return fail(); }
    await tx.run('UPDATE mfa_challenges SET consumed = 1 WHERE token_hash = ?', [challenge.token_hash]);
    await audit(tx, user, method === 'recovery' ? 'mfa-recovery-used' : 'mfa-verified', requestId);
    return { user, rememberMe: Boolean(Number(challenge.remember_me)) };
  });
}

async function actorForSetup(tx, input, session) {
  if (!session) return challengeActor(tx, input.challenge, 'enrollment');
  const user = await lockUser(tx, session.id);
  return admin(user) && Number(user.session_version) === Number(session.session_version) ? { user } : null;
}

async function beginEnrollment(input, session, requestId) {
  crypto.validateMfaKey();
  return db.transaction(async tx => {
    const actor = await actorForSetup(tx, input, session);
    if (!actor) return fail();
    const { user } = actor;
    const factor = await tx.get('SELECT * FROM mfa_factors WHERE user_id = ?', [user.id]);
    if (Number(factor?.enabled)) return fail(409, 'MFA is already enabled');
    if (typeof input.currentPassword !== 'string' || !await bcrypt.compare(input.currentPassword, user.password)) return fail();
    const secret = crypto.generateSecret();
    await tx.run(`INSERT INTO mfa_factors (user_id, pending_secret_encrypted, pending_expires_at)
      VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET pending_secret_encrypted = excluded.pending_secret_encrypted,
      pending_expires_at = excluded.pending_expires_at, pending_attempts = 0`, [user.id, crypto.encryptSecret(secret, user.id), Date.now() + lifetime]);
    await audit(tx, user, 'mfa-enrollment-started', requestId);
    return { secret, uri: crypto.provisioningUri(secret, user.email) };
  });
}

async function newCodes(tx, userId) {
  const codes = Array.from({ length: 10 }, () => randomBytes(16).toString('hex'));
  await tx.run('DELETE FROM mfa_recovery_codes WHERE user_id = ?', [userId]);
  for (const code of codes) await tx.run('INSERT INTO mfa_recovery_codes (user_id, code_hash) VALUES (?, ?)', [userId, crypto.hashOpaqueToken(code)]);
  return codes;
}

async function confirmEnrollment(input, session, requestId) {
  return db.transaction(async tx => {
    const actor = await actorForSetup(tx, input, session);
    if (!actor) return fail();
    const { user } = actor;
    const factor = await tx.get('SELECT * FROM mfa_factors WHERE user_id = ?', [user.id]);
    if (!factor?.pending_secret_encrypted || Number(factor.enabled) || Number(factor.pending_expires_at) <= Date.now() || Number(factor.pending_attempts) >= 5) return fail();
    await tx.run('UPDATE mfa_factors SET pending_attempts = pending_attempts + 1 WHERE user_id = ?', [user.id]);
    if (actor.challenge) await tx.run('UPDATE mfa_challenges SET attempts = attempts + 1 WHERE token_hash = ?', [actor.challenge.token_hash]);
    const step = await crypto.verifyTotp(crypto.decryptSecret(factor.pending_secret_encrypted, user.id), input.code);
    if (step === null) { await audit(tx, user, 'mfa-failed', requestId); return fail(); }
    await tx.run('UPDATE mfa_factors SET enabled = 1, secret_encrypted = pending_secret_encrypted, pending_secret_encrypted = NULL, pending_expires_at = NULL, last_used_step = ? WHERE user_id = ?', [step, user.id]);
    const recoveryCodes = await newCodes(tx, user.id);
    await tx.run('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [user.id]);
    await tx.run('DELETE FROM mfa_challenges WHERE user_id = ?', [user.id]);
    await audit(tx, user, 'mfa-enabled', requestId);
    return { recoveryCodes, signedOut: true };
  });
}

async function getMfaStatus(user) {
  if (!hasAdminAccess(user)) return fail(403, 'Administrator access required');
  const factor = await db.get('SELECT enabled FROM mfa_factors WHERE user_id = ?', [user.id]);
  const codes = await db.get('SELECT COUNT(*) AS count FROM mfa_recovery_codes WHERE user_id = ?', [user.id]);
  return { enabled: Boolean(Number(factor?.enabled)), recoveryCodesRemaining: Number(codes.count), enrollmentRequired: requireAdminEnrollment() };
}

async function manageMfa(operation, input, session, requestId) {
  return db.transaction(async tx => {
    const user = await lockUser(tx, session.id);
    if (!admin(user)) return fail(403, 'Administrator access required');
    if (Number(user.session_version) !== Number(session.session_version)) return fail();
    if (typeof input.currentPassword !== 'string' || !await bcrypt.compare(input.currentPassword, user.password)) return fail();
    let target = user;
    if (operation === 'reset') {
      if (!isSuperadmin(user) || !Number.isSafeInteger(input.targetId) || input.targetId === user.id) return fail(403, 'Reset is not permitted');
      // Lock target after actor; competing resets use a stable row-lock order in future multi-owner deployments.
      target = await lockUser(tx, input.targetId);
      if (!admin(target) || isSuperadmin(target)) return fail(403, 'Reset is not permitted');
    }
    const method = await consumeFactor(tx, user, input);
    if (!method) { await audit(tx, user, 'mfa-failed', requestId); return fail(); }
    let recoveryCodes;
    if (operation === 'regenerate') recoveryCodes = await newCodes(tx, user.id);
    else {
      await tx.run('DELETE FROM mfa_recovery_codes WHERE user_id = ?', [target.id]);
      await tx.run('DELETE FROM mfa_factors WHERE user_id = ?', [target.id]);
    }
    await tx.run('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [target.id]);
    await tx.run('DELETE FROM mfa_challenges WHERE user_id = ?', [target.id]);
    await audit(tx, user, `mfa-${operation}`, requestId, target.id);
    return { signedOut: operation !== 'reset', ...(recoveryCodes ? { recoveryCodes } : {}) };
  });
}

module.exports = { createLoginChallenge, verifyLoginChallenge, beginEnrollment, confirmEnrollment, getMfaStatus, manageMfa };
