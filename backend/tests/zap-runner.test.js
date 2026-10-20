const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Exercise the Windows entry point with a fake Docker CLI: no network or daemon.
test('ZAP runner maps host loopback, propagates failures and cannot reuse old success reports', {
  skip: process.platform !== 'win32'
}, () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-zap-runner-'));
  try {
    const fake = path.join(temp, 'fake-docker.cjs');
    fs.writeFileSync(fake, `const fs=require('fs');
      const args=process.argv.slice(2);
      if(args[0]==='info')process.exit(Number(process.env.FAKE_DOCKER_INFO || 0));
      fs.writeFileSync(process.env.FAKE_DOCKER_ARGS,JSON.stringify(args));
      process.exit(Number(process.env.FAKE_DOCKER_SCAN || 0));`);
    fs.writeFileSync(path.join(temp, 'docker.cmd'), `@echo off\r\n"${process.execPath}" "${fake}" %*\r\nexit /b %ERRORLEVEL%\r\n`);
    const report = path.join(temp, 'reports with spaces');
    const argsFile = path.join(temp, 'args.json');
    const run = (extra = [], env = {}) => spawnSync('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
      path.resolve(__dirname, '../../scripts/security/run-zap-baseline.ps1'), '-ReportDirectory', report, ...extra
    ], { encoding: 'utf8', timeout: 20000, env: { ...process.env, PATH: temp + path.delimiter + process.env.PATH, ZAP_TARGET_URL: '', FAKE_DOCKER_ARGS: argsFile, ...env } });
    fs.mkdirSync(report);
    fs.writeFileSync(path.join(report, 'zap-baseline.html'), 'old success');
    fs.writeFileSync(path.join(report, 'zap-baseline.json'), '{}');
    const unavailable = run([], { FAKE_DOCKER_INFO: '1' });
    assert.equal(unavailable.status, 3, unavailable.stdout + unavailable.stderr);
    assert.ok(!fs.existsSync(path.join(report, 'zap-baseline.html')));
    assert.ok(!fs.existsSync(path.join(report, 'zap-baseline.json')));
    assert.match(fs.readFileSync(path.join(report, 'zap-baseline.md'), 'utf8'), /Skipped/);
    assert.equal(run().status, 0);
    let args = JSON.parse(fs.readFileSync(argsFile));
    assert.equal(args[args.indexOf('-t') + 1], 'http://host.docker.internal:5000/');
    assert.ok(args.includes('host.docker.internal:host-gateway'));
    assert.equal(run(['-TargetUrl', 'http://127.0.0.1:5173/path']).status, 0);
    args = JSON.parse(fs.readFileSync(argsFile));
    assert.equal(args[args.indexOf('-t') + 1], 'http://host.docker.internal:5173/path');
    assert.equal(run([], { ZAP_TARGET_URL: 'https://campus.example.test/' }).status, 0);
    args = JSON.parse(fs.readFileSync(argsFile));
    assert.equal(args[args.indexOf('-t') + 1], 'https://campus.example.test/');
    for (const code of [1, 2, 3]) assert.equal(run([], { FAKE_DOCKER_SCAN: String(code) }).status, code);
    assert.notEqual(run(['-TargetUrl', 'file:///C:/Windows']).status, 0);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
