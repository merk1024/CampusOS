const assert = require('node:assert/strict');
const { generate } = require('otplib');

module.exports = async ({ request, db }) => {
  const login = { login: 'admin@alatoo.edu.kg', password: process.env.SEED_ADMIN_PASSWORD };
  const post = (route, body, token) => request('/api/auth' + route, {
    method: 'POST', body: JSON.stringify(body), headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const first = await post('/login', login);
  assert.equal(first.response.status, 200);
  const setup = await post('/mfa/enroll', { currentPassword: login.password }, first.body.token);
  assert.equal(setup.response.status, 200);
  const code = await generate({ secret: setup.body.secret });
  const confirmation = await post('/mfa/confirm', { code }, first.body.token);
  assert.equal(confirmation.response.status, 200);
  assert.equal(confirmation.body.recoveryCodes.length, 10);
  const challenge = await post('/login', login);
  assert.equal(challenge.body.mfaRequired, true);
  assert.equal(challenge.body.token, undefined);
  const proof = { challenge: challenge.body.challenge, recoveryCode: confirmation.body.recoveryCodes[0] };
  const results = await Promise.all([post('/mfa/verify', proof), post('/mfa/verify', proof)]);
  assert.deepEqual(results.map(result => result.response.status).sort(), [200, 401]);
  const success = results.find(result => result.response.status === 200);
  assert.equal((await request('/api/auth/me', { headers: { Authorization: `Bearer ${success.body.token}` } })).response.status, 200);
  const a = await post('/login', login);
  const b = await post('/login', login);
  const nextCode = await generate({ secret: setup.body.secret, epoch: Math.floor(Date.now() / 1000) + 30 });
  const totpResults = await Promise.all([
    post('/mfa/verify', { challenge: a.body.challenge, code: nextCode }),
    post('/mfa/verify', { challenge: b.body.challenge, code: nextCode })
  ]);
  assert.deepEqual(totpResults.map(result => result.response.status).sort(), [200, 401]);
  const expired = await post('/login', login);
  const { hashOpaqueToken } = require('../../security/mfaCrypto');
  await db.run('UPDATE mfa_challenges SET expires_at = ? WHERE token_hash = ?', [Date.now() - 1, hashOpaqueToken(expired.body.challenge)]);
  assert.equal((await post('/mfa/verify', { challenge: expired.body.challenge, recoveryCode: confirmation.body.recoveryCodes[1] })).response.status, 401);
  const revoked = await post('/login', login);
  await db.run('UPDATE users SET session_version = session_version + 1 WHERE email = ?', [login.login]);
  assert.equal((await post('/mfa/verify', { challenge: revoked.body.challenge, recoveryCode: confirmation.body.recoveryCodes[1] })).response.status, 401);
  const disabled = await post('/login', login);
  await db.run(`UPDATE users SET is_active = ${db.client === 'postgres' ? 'FALSE' : '0'} WHERE email = ?`, [login.login]);
  assert.equal((await post('/mfa/verify', { challenge: disabled.body.challenge, recoveryCode: confirmation.body.recoveryCodes[1] })).response.status, 401);
  await db.run(`UPDATE users SET is_active = ${db.client === 'postgres' ? 'TRUE' : '1'} WHERE email = ?`, [login.login]);
  const roleChanged = await post('/login', login);
  await db.run("UPDATE users SET role = 'teacher' WHERE email = ?", [login.login]);
  assert.equal((await post('/mfa/verify', { challenge: roleChanged.body.challenge, recoveryCode: confirmation.body.recoveryCodes[1] })).response.status, 401);
  await db.run("UPDATE users SET role = 'admin' WHERE email = ?", [login.login]);
  const recover = await post('/login', login);
  const recovered = await post('/mfa/verify', { challenge: recover.body.challenge, recoveryCode: confirmation.body.recoveryCodes[1] });
  assert.equal((await post('/mfa/disable', { currentPassword: login.password, recoveryCode: confirmation.body.recoveryCodes[2] }, recovered.body.token)).response.status, 200);
  const fresh = await post('/login', login);
  const pending = await post('/mfa/enroll', { currentPassword: login.password }, fresh.body.token);
  const actor = await db.get('SELECT id, session_version FROM users WHERE email = ?', [login.login]);
  if (db.client === 'postgres') {
    await db.query(`CREATE FUNCTION fail_mfa_audit() RETURNS trigger AS $$ BEGIN
      IF NEW.action = 'mfa-enabled' THEN RAISE EXCEPTION 'Injected failure'; END IF;
      RETURN NEW; END; $$ LANGUAGE plpgsql`);
    await db.query('CREATE TRIGGER fail_mfa_audit BEFORE INSERT ON system_audit_log FOR EACH ROW EXECUTE FUNCTION fail_mfa_audit()');
  } else {
    await db.query("CREATE TRIGGER fail_mfa_audit BEFORE INSERT ON system_audit_log WHEN NEW.action = 'mfa-enabled' BEGIN SELECT RAISE(ABORT, 'Injected failure'); END");
  }
  try {
    const failed = await post('/mfa/confirm', { code: await generate({ secret: pending.body.secret }) }, fresh.body.token);
    assert.equal(failed.response.status, 503);
    assert.equal(Number((await db.get('SELECT enabled FROM mfa_factors WHERE user_id = ?', [actor.id])).enabled), 0);
    assert.equal(Number((await db.get('SELECT COUNT(*) AS count FROM mfa_recovery_codes WHERE user_id = ?', [actor.id])).count), 0);
    assert.equal(Number((await db.get('SELECT session_version FROM users WHERE id = ?', [actor.id])).session_version), Number(actor.session_version));
  } finally {
    await db.query(db.client === 'postgres' ? 'DROP TRIGGER fail_mfa_audit ON system_audit_log' : 'DROP TRIGGER fail_mfa_audit');
    if (db.client === 'postgres') await db.query('DROP FUNCTION fail_mfa_audit()');
  }
};
