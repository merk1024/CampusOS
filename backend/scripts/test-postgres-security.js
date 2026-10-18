const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const path = require('node:path');

function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 180000 });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr.trim() || 'Docker command failed');
  }
  return result.stdout.trim();
}

async function main() {
  const name = 'campusos-security-' + randomBytes(6).toString('hex');
  const password = randomBytes(24).toString('hex');
  const image = process.env.POSTGRES_TEST_IMAGE || 'postgres:17';
  if (!/^postgres:(?:16|17)(?:-alpine)?$/.test(image)) throw new Error('Unsupported PostgreSQL test image');
  let container;
  try {
    docker(['info', '--format', '{{.ServerVersion}}']);
    container = docker(['run', '--rm', '-d', '--name', name,
      '-p', '127.0.0.1::5432', '-e', 'POSTGRES_DB=campusos_security_test',
      '-e', 'POSTGRES_USER=campusos_test', '-e', 'POSTGRES_PASSWORD=' + password, image]);
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const result = spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'campusos_test', '-d', 'campusos_security_test'], { timeout: 5000 });
      if (result.status === 0) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error('Disposable PostgreSQL did not become ready');
    const ports = JSON.parse(docker(['inspect', '--format', '{{json .NetworkSettings.Ports}}', container]));
    const port = ports['5432/tcp']?.find(entry => entry.HostIp === '127.0.0.1')?.HostPort;
    if (!/^\d+$/.test(port || '')) throw new Error('Could not resolve loopback test port');
    const result = spawnSync(process.execPath, ['--test', path.join(__dirname, '..', 'tests', 'postgres-smoke.test.js')], {
      stdio: 'inherit', timeout: 180000,
      env: { ...process.env, TEST_DATABASE_URL: `postgresql://campusos_test:${password}@127.0.0.1:${port}/campusos_security_test` }
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    if (container) docker(['stop', '--time', '5', container]);
  }
}

main().catch(error => {
  console.error('PostgreSQL security check failed:', error.message);
  process.exitCode = 1;
});
