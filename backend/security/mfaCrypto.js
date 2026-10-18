const { randomBytes, createCipheriv, createDecipheriv, createHash, timingSafeEqual } = require('node:crypto');
const otp = require('otplib');

function validateMfaKey() {
  const encoded = process.env.MFA_ENCRYPTION_KEY || '';
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) {
    throw new Error('MFA_ENCRYPTION_KEY must encode exactly 32 random bytes in canonical base64');
  }
  return key;
}

function encryptSecret(secret, accountId) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', validateMfaKey(), iv);
  cipher.setAAD(Buffer.from(`CampusOS:MFA:${accountId}`));
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

function decryptSecret(value, accountId) {
  const [version, iv, tag, ciphertext, extra] = String(value).split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext || extra) throw new Error('Invalid MFA ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', validateMfaKey(), Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(`CampusOS:MFA:${accountId}`));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}

const hashOpaqueToken = token => createHash('sha256').update(token).digest('hex');
const generateSecret = () => otp.generateSecret({ length: 20 });
const provisioningUri = (secret, email) => otp.generateURI({ issuer: 'CampusOS', label: email, secret, algorithm: 'sha1', digits: 6, period: 30 });

async function verifyTotp(secret, code, now = Date.now()) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code) || !Number.isFinite(now) || now < 0) return null;
  const step = Math.floor(now / 30000);
  for (const candidate of [step, step - 1, step + 1]) {
    if (candidate < 0) continue;
    const expected = await otp.generate({ secret, algorithm: 'sha1', digits: 6, period: 30, epoch: candidate * 30 });
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return candidate;
  }
  return null;
}

module.exports = { validateMfaKey, encryptSecret, decryptSecret, hashOpaqueToken, generateSecret, provisioningUri, verifyTotp };
