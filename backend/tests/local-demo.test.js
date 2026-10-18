const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const supportPath = path.join(root, 'scripts/demo/demo-support.js');

test('demo launcher exists and defaults to loopback with explicit LAN opt-in', () => {
  assert.ok(fs.existsSync(supportPath), 'Isolated local demo launcher is missing');
  const { parseOptions, chooseHost } = require(supportPath);
  assert.equal(chooseHost(parseOptions([]), []), '127.0.0.1');
  assert.equal(chooseHost(parseOptions(['--lan']), ['192.168.1.20']), '192.168.1.20');
  assert.equal(chooseHost(parseOptions(['--lan', '--host=10.0.0.4']), ['10.0.0.4']), '10.0.0.4');
  assert.throws(() => parseOptions(['--host=8.8.8.8']));
  assert.throws(() => parseOptions(['--host=192.168.1.20']));
  assert.throws(() => parseOptions(['--port=invalid']));
  assert.throws(() => parseOptions(['--database=production.db']));
  assert.throws(() => chooseHost(parseOptions(['--lan']), []));
  assert.throws(() => chooseHost(parseOptions(['--lan']), ['192.168.1.20', '10.0.0.4']));
});

test('demo configuration overrides inherited production database and credentials', () => {
  const { demoEnvironment } = require(supportPath);
  const env = demoEnvironment('/temporary/demo.db', 'http://192.168.1.20:4175', 'demo-password', {
    DB_CLIENT: 'postgres', DATABASE_URL: 'postgresql://production.invalid/db',
    NODE_ENV: 'production', MFA_ENCRYPTION_KEY: 'old-key',
    AUDIT_CHECKPOINT_PATH: '/production/checkpoint', AUTH_COOKIE_DOMAIN: 'production.invalid'
  });
  assert.equal(env.DB_CLIENT, 'sqlite');
  assert.equal(env.DATABASE_URL, '');
  assert.equal(env.SQLITE_DB_PATH, '/temporary/demo.db');
  assert.equal(env.APP_ENV, 'demo');
  assert.equal(env.AUTH_COOKIE_SECURE, 'false');
  assert.equal(env.AUTH_COOKIE_DOMAIN, '');
  assert.equal(env.AUDIT_CHECKPOINT_PATH, '');
  assert.equal(env.TRUST_PROXY, 'true');
  assert.equal(env.FRONTEND_URL, 'http://192.168.1.20:4175');
  assert.notEqual(env.MFA_ENCRYPTION_KEY, 'old-key');
  assert.equal(Buffer.from(env.MFA_ENCRYPTION_KEY, 'base64').length, 32);
});

test('gateway serves only built assets and proxies API cookies without changing Origin', async () => {
  const { createGateway } = require(supportPath);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-gateway-test-'));
  fs.writeFileSync(path.join(directory, 'index.html'), '<h1>Demo fixture</h1>');
  const backend = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Set-Cookie', 'demo=value; HttpOnly; SameSite=Lax');
    res.end(JSON.stringify({ path: req.url, origin: req.headers.origin, cookie: req.headers.cookie,
      forwardedFor: req.headers['x-forwarded-for'] }));
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const gateway = createGateway(directory, () => backend.address().port);
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${gateway.address().port}`;
  try {
    assert.match(await (await fetch(url + '/courses')).text(), /Demo fixture/);
    const response = await fetch(url + '/api/auth/me', { headers: { Origin: url, Cookie: 'demo=value', 'X-Forwarded-For': '8.8.8.8' } });
    const body = await response.json();
    assert.equal(body.path, '/api/auth/me');
    assert.equal(body.origin, url);
    assert.equal(body.cookie, 'demo=value');
    assert.equal(body.forwardedFor, '127.0.0.1');
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    for (const resource of ['/.env', '/backend/.env', '/package.json', '/%2e%2e%2f.env']) {
      assert.notEqual((await fetch(url + resource)).status, 200);
    }
  } finally {
    await new Promise(resolve => gateway.close(resolve));
    await new Promise(resolve => backend.close(resolve));
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(directory).startsWith('campusos-gateway-test-'));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('real isolated demo supports login and cookie writes through the same origin', { timeout: 60000 }, async () => {
  const child = spawn(process.execPath, [path.join(root, 'scripts/demo/local-demo.js'), '--port=0'], {
    cwd: root, env: { ...process.env, DATABASE_URL: 'postgresql://must-not-be-used.invalid/db' }, stdio: ['pipe', 'pipe', 'pipe']
  });
  let output = '';
  let details;
  child.stderr.on('data', () => {});
  const exited = new Promise(resolve => child.once('exit', resolve));
  try {
    details = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Local demo startup timed out')), 45000);
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', () => { clearTimeout(timeout); reject(new Error('Local demo exited before readiness')); });
      child.stdout.on('data', data => {
        output += data.toString();
        const match = output.match(/^DEMO_READY (.+)$/m);
        if (match) { clearTimeout(timeout); resolve(JSON.parse(match[1])); }
      });
    });
    const response = await fetch(details.url + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: details.url },
      body: JSON.stringify({ login: 'admin@alatoo.edu.kg', password: details.password })
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const login = await response.json();
    assert.equal(login.user.role, 'admin');
    assert.equal(login.token, undefined);
    const write = await fetch(details.url + '/users');
    assert.equal(write.status, 200);
    const csrf = await fetch(details.url + '/api/users/profile/me', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: 'http://untrusted.invalid', Cookie: cookie },
      body: JSON.stringify({ phone: 'demo-test' })
    });
    assert.equal(csrf.status, 403);
    const update = await fetch(details.url + '/api/users/profile/me', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: details.url, Cookie: cookie },
      body: JSON.stringify({ phone: 'demo-test' })
    });
    assert.equal(update.status, 200);
    assert.ok(fs.existsSync(details.directory));
    child.stdin.write('\u0003');
    let stopTimeout;
    try {
      await Promise.race([exited, new Promise((resolve, reject) => {
        stopTimeout = setTimeout(() => reject(new Error('Ctrl+C did not stop the demo cleanly')), 3000);
      })]);
    } finally { clearTimeout(stopTimeout); }
    assert.equal(fs.existsSync(details.directory), false);
  } finally {
    if (child.exitCode === null) { child.kill('SIGTERM'); await exited; }
    // Windows may terminate a child without delivering its JS signal handler.
    if (details && fs.existsSync(details.directory)) {
      const resolved = path.resolve(details.directory);
      assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
      assert.ok(path.basename(resolved).startsWith('campusos-local-demo-'));
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
});
