const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-zap-'));
const password = randomBytes(24).toString('hex');
Object.assign(process.env, { NODE_ENV: 'test', APP_ENV: 'test', DB_CLIENT: 'sqlite', DATABASE_URL: '',
  SQLITE_DB_PATH: path.join(directory, 'demo.db'), JWT_SECRET: randomBytes(32).toString('hex'),
  MFA_ENCRYPTION_KEY: randomBytes(32).toString('base64'), MFA_REQUIRE_ADMIN_ENROLLMENT: 'false',
  AUDIT_CHECKPOINT_PATH: '', MONITORING_WEBHOOK_URL: '', FRONTEND_URL: 'http://campusos-target:5117',
  AUTH_COOKIE_SECURE: 'false', AUTH_COOKIE_SAMESITE: 'lax', AUTH_COOKIE_DOMAIN: '', AUTH_EXPOSE_TOKEN_RESPONSE: 'false',
  SUPERADMIN_BOOTSTRAP_PASSWORD: password, SEED_ADMIN_PASSWORD: password, SEED_TEACHER_PASSWORD: password, SEED_STUDENT_PASSWORD: password });
const db = require('../../backend/config/database');
let server;
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  if (server) await new Promise(resolve => server.close(resolve));
  await db.close();
  const resolved = path.resolve(directory);
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('campusos-zap-')) throw new Error('Unsafe cleanup path');
  fs.rmSync(resolved, { recursive: true, force: true });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => close().then(() => process.exit(0)));
(async () => { await require('../../backend/seeds/seed')(); server = await require('../../backend/server').startServer(5117); })()
  .catch(async error => { console.error('Disposable ZAP target failed:', error.code || error.name, error.message); await close(); process.exitCode = 1; });
