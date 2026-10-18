const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { encryptSecret, decryptSecret, hashOpaqueToken, verifyTotp, generateSecret, provisioningUri, validateMfaKey } = require('../security/mfaCrypto');

test('MFA ciphertext is randomized, authenticated and bound to its account', () => {
  process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  const first = encryptSecret(secret, 12);
  assert.notEqual(first, encryptSecret(secret, 12));
  assert.ok(!first.includes(secret));
  assert.equal(decryptSecret(first, 12), secret);
  assert.throws(() => decryptSecret(first, 13));
  const parts = first.split('.');
  const ciphertext = Buffer.from(parts[3], 'base64url');
  ciphertext[0] ^= 1;
  parts[3] = ciphertext.toString('base64url');
  assert.throws(() => decryptSecret(parts.join('.'), 12));
  process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  assert.throws(() => decryptSecret(first, 12));
});

test('MFA key validation fails closed without echoing secret input', () => {
  for (const key of ['', 'not-a-key', Buffer.alloc(31).toString('base64'), Buffer.alloc(33).toString('base64')]) {
    process.env.MFA_ENCRYPTION_KEY = key;
    assert.throws(() => validateMfaKey(), { message: 'MFA_ENCRYPTION_KEY must encode exactly 32 random bytes in canonical base64' });
  }
});

test('TOTP matches RFC 6238 SHA1 vectors truncated to six digits and rejects malformed codes', async () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  for (const [seconds, code] of [[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037']]) {
    assert.equal(await verifyTotp(secret, code, seconds * 1000), Math.floor(seconds / 30));
  }
  assert.equal(await verifyTotp(secret, '287082', 89 * 1000), 1);
  assert.equal(await verifyTotp(secret, '287082', 120 * 1000), null);
  for (const code of ['', '12345', '1234567', 287082, 'abcdef', '287082 ']) {
    assert.equal(await verifyTotp(secret, code, 59000), null);
  }
});

test('MFA secrets and opaque-token hashes support local provisioning', () => {
  const secret = generateSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  assert.notEqual(secret, generateSecret());
  assert.equal(hashOpaqueToken('token').length, 64);
  assert.notEqual(hashOpaqueToken('token'), hashOpaqueToken('other'));
  const uri = new URL(provisioningUri(secret, 'admin@example.org'));
  assert.equal(uri.protocol, 'otpauth:');
  assert.equal(uri.searchParams.get('secret'), secret);
  assert.equal(uri.searchParams.get('issuer'), 'CampusOS');
});
