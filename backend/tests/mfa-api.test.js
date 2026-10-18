const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-mfa-api-'));
Object.assign(process.env, { NODE_ENV: 'test', DB_CLIENT: 'sqlite', SQLITE_DB_PATH: path.join(temp, 'test.db'),
  JWT_SECRET: 'mfa-api-test-secret', MFA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  SUPERADMIN_BOOTSTRAP_PASSWORD: 'MfaOwnerTest123!', SEED_ADMIN_PASSWORD: 'MfaAdminTest123!',
  SEED_TEACHER_PASSWORD: 'MfaTeacherTest123!', SEED_STUDENT_PASSWORD: 'MfaStudentTest123!' });
const db = require('../config/database');
let server;
let base;
test.before(async () => { await require('../seeds/seed')(); server = await require('../server').startServer(0); base = 'http://127.0.0.1:' + server.address().port; });
test.after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await db.close(); fs.rmSync(temp, { recursive: true, force: true }); });
const request = async (route, body, token) => {
  const res = await fetch(base + '/api/auth' + route, { method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, cookie: res.headers.get('set-cookie'), body: await res.json() };
};
let enrolled;

test('administrator enrollment, two-step login and single-use recovery are enforced', async () => {
  const login = { login: 'admin@alatoo.edu.kg', password: process.env.SEED_ADMIN_PASSWORD };
  const initial = await request('/login', login);
  const setup = await request('/mfa/enroll', { currentPassword: login.password }, initial.body.token);
  assert.equal(setup.status, 200);
  assert.ok(setup.body.secret);
  const { generate } = require('otplib');
  const code = await generate({ secret: setup.body.secret });
  const confirmed = await request('/mfa/confirm', { code }, initial.body.token);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.recoveryCodes.length, 10);
  assert.equal((await request('/me', null, initial.body.token)).status, 401);
  const challenge = await request('/login', login);
  assert.equal(challenge.body.mfaRequired, true);
  assert.equal(challenge.cookie, null);
  assert.equal(challenge.body.token, undefined);
  assert.equal((await request('/me', null, challenge.body.challenge)).status, 401);
  const proof = { challenge: challenge.body.challenge, recoveryCode: confirmed.body.recoveryCodes[0] };
  const parallel = await Promise.all([request('/mfa/verify', proof), request('/mfa/verify', proof)]);
  assert.deepEqual(parallel.map(r => r.status).sort(), [200, 401]);
  const success = parallel.find(r => r.status === 200);
  enrolled = { codes: confirmed.body.recoveryCodes, secret: setup.body.secret, token: success.body.token, login };
  assert.equal((await request('/me', null, success.body.token)).status, 200);
  const next = await request('/login', login);
  assert.equal((await request('/mfa/verify', { challenge: next.body.challenge, recoveryCode: proof.recoveryCode })).status, 401);
  for (let i = 0; i < 5; i++) assert.equal((await request('/mfa/verify', { challenge: next.body.challenge, code: 'nototp' })).status, 401);
  assert.equal((await request('/mfa/verify', { challenge: next.body.challenge, recoveryCode: confirmed.body.recoveryCodes[1] })).status, 401);
  const status = await request('/mfa/status', null, success.body.token);
  assert.equal(status.body.recoveryCodesRemaining, 9);
  const rejectedChallenges = await db.get("SELECT COUNT(*) AS count FROM system_audit_log WHERE action = 'mfa-failed' AND changed_by IS NULL");
  assert.ok(Number(rejectedChallenges.count) > 0, 'Reused or exhausted challenges must leave a sanitized audit event');
  assert.ok(!JSON.stringify(status.body).includes(setup.body.secret));
  const actor = await db.get('SELECT id FROM users WHERE email = ?', [login.login]);
  assert.ok(!(await db.get('SELECT secret_encrypted FROM mfa_factors WHERE user_id = ?', [actor.id])).secret_encrypted.includes(setup.body.secret));
});

test('concurrent TOTP use on independent challenges succeeds only once', async () => {
  const factor = await db.get('SELECT secret_encrypted FROM mfa_factors WHERE user_id = (SELECT id FROM users WHERE email = ?)', [enrolled.login.login]);
  const user = await db.get('SELECT id FROM users WHERE email = ?', [enrolled.login.login]);
  const secret = require('../security/mfaCrypto').decryptSecret(factor.secret_encrypted, user.id);
  const code = await require('otplib').generate({ secret, epoch: Math.floor(Date.now() / 1000) + 30 });
  const a = await request('/login', enrolled.login);
  const b = await request('/login', enrolled.login);
  const results = await Promise.all([request('/mfa/verify', { challenge: a.body.challenge, code }), request('/mfa/verify', { challenge: b.body.challenge, code })]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 401]);
});

test('enrollment rolls back factor, codes and revocation if audit insertion fails', async () => {
  await db.run("UPDATE users SET role = 'admin', session_version = session_version + 1 WHERE email = 'teacher@alatoo.edu.kg'");
  const login = await request('/login', { login: 'teacher@alatoo.edu.kg', password: process.env.SEED_TEACHER_PASSWORD });
  const actor = await db.get('SELECT id, session_version FROM users WHERE email = ?', ['teacher@alatoo.edu.kg']);
  const setup = await request('/mfa/enroll', { currentPassword: process.env.SEED_TEACHER_PASSWORD }, login.body.token);
  const code = await require('otplib').generate({ secret: setup.body.secret });
  await db.query(`CREATE TRIGGER fail_mfa_audit BEFORE INSERT ON system_audit_log
    WHEN NEW.action = 'mfa-enabled' BEGIN SELECT RAISE(ABORT, 'Injected failure'); END`);
  try {
    assert.equal((await request('/mfa/confirm', { code }, login.body.token)).status, 503);
    assert.equal((await db.get('SELECT enabled FROM mfa_factors WHERE user_id = ?', [actor.id])).enabled, 0);
    assert.equal((await db.get('SELECT session_version FROM users WHERE id = ?', [actor.id])).session_version, actor.session_version);
    assert.equal((await db.get('SELECT COUNT(*) AS count FROM mfa_recovery_codes WHERE user_id = ?', [actor.id])).count, 0);
    assert.equal((await request('/me', null, login.body.token)).status, 200);
  } finally { await db.query('DROP TRIGGER fail_mfa_audit'); }
});

test('superadministrator reset needs fresh MFA, cannot reset an owner and revokes target sessions', async () => {
  assert.equal((await request('/mfa/reset', { currentPassword: enrolled.login.password, targetId: 1, recoveryCode: enrolled.codes[2] }, enrolled.token)).status, 403);
  const ownerLogin = { login: 'erbol.abdusatov@alatoo.edu.kg', password: process.env.SUPERADMIN_BOOTSTRAP_PASSWORD };
  const owner = await request('/login', ownerLogin);
  const setup = await request('/mfa/enroll', { currentPassword: ownerLogin.password }, owner.body.token);
  const codes = await request('/mfa/confirm', { code: await require('otplib').generate({ secret: setup.body.secret }) }, owner.body.token);
  const challenge = await request('/login', ownerLogin);
  const session = await request('/mfa/verify', { challenge: challenge.body.challenge, recoveryCode: codes.body.recoveryCodes[0] });
  const target = await db.get('SELECT id FROM users WHERE email = ?', [enrolled.login.login]);
  const ownerRow = await db.get('SELECT id FROM users WHERE email = ?', [ownerLogin.login]);
  const baseProof = { currentPassword: ownerLogin.password, recoveryCode: codes.body.recoveryCodes[1] };
  assert.equal((await request('/mfa/reset', { ...baseProof, targetId: ownerRow.id }, session.body.token)).status, 403);
  assert.equal((await request('/mfa/reset', { ...baseProof, targetId: target.id }, session.body.token)).status, 200);
  assert.equal((await request('/me', null, enrolled.token)).status, 401);
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM mfa_recovery_codes WHERE user_id = ?', [target.id])).count, 0);
  process.env.MFA_REQUIRE_ADMIN_ENROLLMENT = 'true';
  const restricted = await request('/login', enrolled.login);
  assert.equal(restricted.body.enrollmentRequired, true);
  assert.equal(restricted.body.token, undefined);
  const pending = await request('/mfa/enroll', { challenge: restricted.body.challenge, currentPassword: enrolled.login.password });
  assert.equal(pending.status, 200);
  const confirmed = await request('/mfa/confirm', { challenge: restricted.body.challenge, code: await require('otplib').generate({ secret: pending.body.secret }) });
  assert.equal(confirmed.status, 200);
  process.env.MFA_REQUIRE_ADMIN_ENROLLMENT = 'false';
});
