const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const { randomBytes } = require('node:crypto');
const { parseOptions, chooseHost, demoEnvironment, createGateway } = require('./demo-support');
const root = path.resolve(__dirname, '../..');
let directory;
let gateway;
let backend;
let db;
let closing;

function closeServer(server) {
  return server ? new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }) : Promise.resolve();
}

function close() {
  if (closing) return closing;
  closing = (async () => {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    await closeServer(gateway);
    await closeServer(backend);
    if (db) await db.close();
    if (directory) {
      const resolved = path.resolve(directory);
      if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)
        || !path.basename(resolved).startsWith('campusos-local-demo-')) throw new Error('Unsafe demo cleanup path');
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  })();
  return closing;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const addresses = Object.values(os.networkInterfaces()).flat()
    .filter(item => !item.internal && item.family === 'IPv4').map(item => item.address);
  const host = chooseHost(options, addresses);
  const frontendRequire = createRequire(path.join(root, 'frontend/package.json'));
  // No .env files are used by the frontend build; API calls use this same origin.
  const { build } = await import(pathToFileURL(frontendRequire.resolve('vite')).href);
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-local-demo-'));
  const web = path.join(directory, 'web');
  await build({ root: path.join(root, 'frontend'), envFile: false,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') },
    build: { outDir: web, emptyOutDir: true } });
  gateway = createGateway(web, () => backend?.address()?.port);
  await new Promise((resolve, reject) => {
    gateway.once('error', reject);
    gateway.listen(options.port, host, resolve);
  });
  const url = `http://${host}:${gateway.address().port}`;
  const password = randomBytes(18).toString('base64url');
  Object.assign(process.env, demoEnvironment(path.join(directory, 'demo.db'), url, password));
  db = require('../../backend/config/database');
  await require('../../backend/seeds/seed')();
  backend = await require('../../backend/server').startServer(0, '127.0.0.1');
  if (backend.address().address !== '127.0.0.1') throw new Error('Demo API must remain loopback-only');
  console.log('\nDISPOSABLE CAMPUSOS DEMO - NO REAL DATA');
  console.log('Open: ' + url);
  console.log('Owner: owner@campusos.test | Admin: admin@alatoo.edu.kg');
  console.log('Teacher: teacher@alatoo.edu.kg | Student: 240141052');
  console.log('All demo accounts use the temporary password in DEMO_READY below.');
  console.log('HTTP demo only. Use trusted Wi-Fi; no public tunnels or router port forwarding.');
  console.log('Ctrl+C stops the demo and removes its temporary database. Each start is fresh.');
  console.log('DEMO_READY ' + JSON.stringify({ url, password, directory }));
}

function stop() {
  close().then(() => process.exit(0), () => process.exit(1));
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, stop);
// npm/Windows PTY wrappers may deliver Ctrl+C as input rather than a signal.
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.on('data', data => { if (data.includes(3)) stop(); });
process.stdin.resume();
main().catch(async error => {
  console.error('Local demo failed: ' + error.message);
  await close();
  process.exitCode = 1;
});
