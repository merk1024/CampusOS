const path = require('node:path');
const http = require('node:http');
const { isIPv4 } = require('node:net');
const { createRequire } = require('node:module');
const { randomBytes } = require('node:crypto');
const backendRequire = createRequire(path.resolve(__dirname, '../../backend/package.json'));

function privateAddress(address) {
  if (!isIPv4(address)) return false;
  const [a, b] = address.split('.').map(Number);
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

function parseOptions(args) {
  const options = { lan: false, port: 4175 };
  const seen = new Set();
  for (const arg of args) {
    const key = arg.split('=')[0];
    if (seen.has(key)) throw new Error('Duplicate demo option: ' + key);
    seen.add(key);
    if (arg === '--lan') options.lan = true;
    else if (/^--host=/.test(arg)) options.host = arg.slice(7);
    else if (/^--port=\d+$/.test(arg)) options.port = Number(arg.slice(7));
    else throw new Error('Unknown option. Use --lan, --host=PRIVATE_IPV4 or --port=4175.');
  }
  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) throw new Error('Invalid demo port');
  if (options.host && options.host !== '127.0.0.1' && (!options.lan || !privateAddress(options.host))) {
    throw new Error('Network demo requires --lan and a private IPv4 address');
  }
  if (options.lan && options.host === '127.0.0.1') throw new Error('Use demo:local for loopback');
  return options;
}

function chooseHost(options, addresses) {
  if (!options.lan) return '127.0.0.1';
  const candidates = [...new Set(addresses.filter(privateAddress))];
  if (options.host && candidates.includes(options.host)) return options.host;
  if (!options.host && candidates.length === 1) return candidates[0];
  throw new Error('Choose your Wi-Fi IPv4 with --host=ADDRESS. Available private addresses: ' + (candidates.join(', ') || 'none'));
}

function demoEnvironment(database, origin, password, inherited = process.env) {
  return { ...inherited,
    NODE_ENV: 'development', APP_ENV: 'demo', DB_CLIENT: 'sqlite',
    SQLITE_DB_PATH: database, DATABASE_URL: '', DB_HOST: '', DB_PORT: '', DB_NAME: '', DB_USER: '', DB_PASSWORD: '',
    JWT_SECRET: randomBytes(32).toString('hex'), JWT_EXPIRE: '2h',
    MFA_ENCRYPTION_KEY: randomBytes(32).toString('base64'), MFA_REQUIRE_ADMIN_ENROLLMENT: 'false',
    AUDIT_CHECKPOINT_PATH: '', MONITORING_WEBHOOK_URL: '', TRUST_PROXY: 'true',
    FRONTEND_URL: origin, AUTH_COOKIE_SECURE: 'false', AUTH_COOKIE_SAMESITE: 'lax',
    AUTH_COOKIE_DOMAIN: '', AUTH_EXPOSE_TOKEN_RESPONSE: 'false',
    SUPERADMIN_EMAIL: 'owner@campusos.test', SUPERADMIN_NAME: 'Demo Owner',
    SUPERADMIN_BOOTSTRAP_PASSWORD: password, SEED_ADMIN_PASSWORD: password,
    SEED_TEACHER_PASSWORD: password, SEED_STUDENT_PASSWORD: password
  };
}

function createGateway(directory, backendPort) {
  const express = backendRequire('express');
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    if (req.url !== '/api' && !req.url.startsWith('/api/') && !req.url.startsWith('/api?')) return next();
    const port = backendPort();
    if (!port) return res.status(503).json({ error: 'Demo is starting' });
    const headers = { ...req.headers, host: `127.0.0.1:${port}` };
    for (const key of ['connection', 'proxy-authorization', 'proxy-connection', 'upgrade', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto']) delete headers[key];
    // Exactly one trusted hop: the API is loopback-only and the peer IP is socket-derived.
    headers['x-forwarded-for'] = req.socket.remoteAddress;
    // The destination is fixed loopback; the client cannot select a proxy target.
    const upstream = http.request({ hostname: '127.0.0.1', port, path: req.url, method: req.method, headers }, response => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
      response.on('error', () => res.destroy());
    });
    upstream.setTimeout(30000, () => upstream.destroy());
    upstream.on('error', () => {
      if (!res.headersSent) res.status(502).json({ error: 'Demo API is unavailable' });
      else res.destroy();
    });
    req.on('aborted', () => upstream.destroy());
    res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
    req.pipe(upstream);
  });
  app.use(express.static(directory, { dotfiles: 'deny', index: 'index.html', redirect: false }));
  app.use((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method) || path.extname(req.path)
      || req.path.split('/').some(part => part.startsWith('.'))) return res.sendStatus(404);
    res.sendFile(path.join(directory, 'index.html'));
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.sendStatus(error.status >= 400 && error.status < 500 ? error.status : 500);
  });
  return http.createServer(app);
}

module.exports = { privateAddress, parseOptions, chooseHost, demoEnvironment, createGateway };
