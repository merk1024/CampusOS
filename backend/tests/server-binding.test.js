const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-binding-'));
Object.assign(process.env, {
  NODE_ENV: 'test', APP_ENV: 'test', DB_CLIENT: 'sqlite',
  SQLITE_DB_PATH: path.join(directory, 'test.db'),
  JWT_SECRET: randomBytes(32).toString('hex'),
  MFA_REQUIRE_ADMIN_ENROLLMENT: 'false', MFA_ENCRYPTION_KEY: '',
  MONITORING_WEBHOOK_URL: ''
});
const db = require('../config/database');
const { startServer } = require('../server');

test.after(async () => {
  await db.close();
  const resolved = path.resolve(directory);
  assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
  assert.ok(path.basename(resolved).startsWith('campusos-binding-'));
  fs.rmSync(resolved, { recursive: true, force: true });
});

test('explicit loopback host confines the API listener', async () => {
  const server = await startServer(0, '127.0.0.1');
  try {
    assert.equal(server.address().address, '127.0.0.1');
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('omitting host preserves container and production wildcard binding', async () => {
  const server = await startServer(0);
  try {
    assert.ok(['::', '0.0.0.0'].includes(server.address().address));
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
