const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const yaml = require('js-yaml');

// Always isolate browser tests from developer and deployment databases.
Object.assign(process.env, {
  NODE_ENV: 'test', APP_ENV: 'test', DB_CLIENT: 'sqlite', SQLITE_DB_PATH: ':memory:',
  DATABASE_URL: '', JWT_SECRET: 'browser-tests-only-jwt-secret', TRUST_PROXY: 'false',
  FRONTEND_URL: 'http://127.0.0.1:4178', AUTH_COOKIE_SECURE: 'false',
  AUTH_COOKIE_SAMESITE: 'lax', AUTH_COOKIE_DOMAIN: '', MONITORING_WEBHOOK_URL: '',
  SUPERADMIN_BOOTSTRAP_PASSWORD: 'BrowserOwner123!', SEED_ADMIN_PASSWORD: 'BrowserAdmin123!',
  SEED_TEACHER_PASSWORD: 'BrowserTeacher123!', SEED_STUDENT_PASSWORD: 'BrowserStudent123!'
});
const db = require('../../backend/config/database');
const seed = require('../../backend/seeds/seed');
const { app } = require('../../backend/server');
const express = require('../../backend/node_modules/express');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-browser-build-'));
let server;
async function close() {
  if (server) await new Promise(resolve => server.close(resolve));
  await db.close();
  fs.rmSync(output, { recursive: true, force: true });
}
async function main() {
  execFileSync(process.execPath, [path.resolve(__dirname, '../node_modules/vite/bin/vite.js'), 'build', '--outDir', output], {
    cwd: path.resolve(__dirname, '..'), stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production', VITE_API_BASE_URL: '/api' }
  });
  await seed();
  const site = express();
  site.disable('x-powered-by');
  site.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') return app(req, res, next);
    next();
  });
  // Exercise the deployment policy itself, not a separate test-only copy.
  const blueprintName = process.env.E2E_BLUEPRINT || 'render.yaml';
  if (!['render.yaml', 'render.staging.yaml'].includes(blueprintName)) throw new Error('Unknown test blueprint');
  const blueprint = yaml.load(fs.readFileSync(path.resolve(__dirname, '../..', blueprintName), 'utf8'));
  const frontend = blueprint.services.find(service => service.runtime === 'static');
  site.use((req, res, next) => {
    for (const header of frontend.headers || []) {
      if (header.path !== '/*') throw new Error('Test fixture supports only global header rules');
      res.setHeader(header.name, header.value);
    }
    next();
  });
  site.use(express.static(output));
  site.get('*', (req, res) => res.sendFile(path.join(output, 'index.html')));
  server = site.listen(4178, '127.0.0.1');
  server.on('error', error => { console.error(error); process.exitCode = 1; close(); });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => close().then(() => process.exit(0)));
}
main().catch(async error => { console.error(error); await close(); process.exitCode = 1; });
