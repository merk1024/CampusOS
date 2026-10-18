const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-e2e-'));
Object.assign(process.env, {
  NODE_ENV: 'test', APP_ENV: 'test', DB_CLIENT: 'sqlite',
  SQLITE_DB_PATH: path.join(directory, 'demo.db'),
  JWT_SECRET: 'disposable-e2e-session-signing-only',
  FRONTEND_URL: 'http://127.0.0.1:4173',
  AUTH_COOKIE_SECURE: 'false', AUTH_COOKIE_SAMESITE: 'lax', AUTH_COOKIE_DOMAIN: '',
  MONITORING_WEBHOOK_URL: '',
  SUPERADMIN_EMAIL: 'erbol.abdusatov@alatoo.edu.kg',
  SUPERADMIN_BOOTSTRAP_PASSWORD: 'CampusOS-E2E-Only-2026!',
  SEED_ADMIN_PASSWORD: 'CampusOS-E2E-Only-2026!',
  SEED_TEACHER_PASSWORD: 'CampusOS-E2E-Only-2026!',
  SEED_STUDENT_PASSWORD: 'CampusOS-E2E-Only-2026!',
  AUTH_EXPOSE_TOKEN_RESPONSE: 'false',
  MFA_ENCRYPTION_KEY: require('node:crypto').randomBytes(32).toString('base64'),
  MFA_REQUIRE_ADMIN_ENROLLMENT: 'false'
});
const db = require('../../backend/config/database');
let server;
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  if (server) await new Promise(resolve => server.close(resolve));
  await db.close();
  fs.rmSync(directory, { recursive: true, force: true });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => close().then(() => process.exit(0)));
(async () => {
  await require('../../backend/seeds/seed')();
  server = await require('../../backend/server').startServer(5117, '127.0.0.1');
  if (server.address()?.address !== '127.0.0.1') throw new Error('E2E API must bind to loopback only');
})().catch(async error => {
  console.error(error.message);
  await close();
  process.exitCode = 1;
});
