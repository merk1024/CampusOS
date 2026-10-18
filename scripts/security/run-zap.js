const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable';
function validateInvocation(args, env) {
  if (args.length || env.ZAP_TARGET_URL) throw new Error('This runner scans only its own disposable target; URL overrides are forbidden');
}
function automationPlan() {
  const target = 'http://campusos-target:5117';
  return {
    env: { contexts: [{ name: 'disposable-campusos', urls: [target], includePaths: [target + '/.*'] }],
      parameters: { failOnError: true, failOnWarning: true, progressToStdout: true } },
    jobs: [
      { type: 'passiveScan-config', parameters: { scanOnlyInScope: true } },
      { type: 'requestor', requests: [
        ...['/', '/health', '/ready', '/api'].map(url => ({ url: target + url, method: 'GET', responseCode: 200 })),
        ...['/api/auth/me', '/api/users', '/api/users/profile/me', '/api/grades/student/240141052'].map(url => ({ url: target + url, method: 'GET', responseCode: 401 })),
        { url: target + '/api/auth/register', method: 'POST', headers: ['Content-Type: application/json'], data: '{}', responseCode: 403 },
        { url: target + '/api/ops/audit-integrity/verify', method: 'POST', headers: ['Content-Type: application/json'], data: '{}', responseCode: 401 }
      ] },
      { type: 'passiveScan-wait', parameters: { maxDuration: 3 } },
      ...['traditional-json', 'traditional-html'].map(template => ({ type: 'report', alwaysRun: true,
        parameters: { template, reportDir: '/zap/wrk', reportFile: 'zap-' + template, reportTitle: 'CampusOS disposable API passive scan', displayReport: false } })),
      { type: 'exitStatus', alwaysRun: true, parameters: { errorLevel: 'High', warnLevel: 'Medium', okExitValue: 0, errorExitValue: 1, warnExitValue: 2 } }
    ]
  };
}
function docker(args, options = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 300000, ...options });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || 'Docker operation failed: ' + args[0]);
  return result.stdout?.trim() || '';
}
function validateReport(report) {
  if (!Array.isArray(report?.site) || report.site.length !== 1 || report.site[0]['@host'] !== 'campusos-target'
    || String(report.site[0]['@port']) !== '5117' || !Array.isArray(report.site[0].alerts)) throw new Error('ZAP report does not cover the disposable target');
  const counts = { high: 0, medium: 0, low: 0, informational: 0 };
  const levels = ['informational', 'low', 'medium', 'high'];
  for (const alert of report.site[0].alerts) {
    if (!/^[0-3]$/.test(String(alert.riskcode))) throw new Error('Unrecognized ZAP risk level');
    counts[levels[Number(alert.riskcode)]]++;
  }
  if (counts.high || counts.medium) throw new Error('ZAP Medium/High alerts require review');
  return counts;
}
async function main() {
  validateInvocation(process.argv.slice(2), process.env);
  const root = path.resolve(__dirname, '../..');
  const id = randomBytes(6).toString('hex');
  const network = 'campusos-zap-' + id;
  const target = network + '-target';
  const scanner = network + '-scanner';
  const targetImage = 'campusos-zap-target:' + id;
  const directory = path.join(root, 'output/security/zap', id);
  fs.mkdirSync(directory, { recursive: true, mode: 0o777 }); fs.chmodSync(directory, 0o777);
  // JSON is valid YAML; use the exact tested AF plan with no target substitutions.
  fs.writeFileSync(path.join(directory, 'plan.yaml'), JSON.stringify(automationPlan(), null, 2));
  const manifest = { status: 'running', startedAt: new Date().toISOString(), scan: 'anonymous API passive only', target: 'disposable Docker network only', requests: 10 };
  let createdNetwork = false;
  let builtImage = false;
  let createdTarget = false;
  try {
    docker(['info', '--format', '{{.ServerVersion}}']);
    docker(['pull', ZAP_IMAGE], { stdio: 'inherit' });
    docker(['build', '-f', 'scripts/security/Dockerfile.zap', '-t', targetImage, root], { cwd: root, stdio: 'inherit', timeout: 600000 });
    builtImage = true;
    manifest.zapImageId = docker(['image', 'inspect', '--format', '{{.Id}}', ZAP_IMAGE]);
    manifest.targetImageId = docker(['image', 'inspect', '--format', '{{.Id}}', targetImage]);
    docker(['network', 'create', '--internal', network]); createdNetwork = true;
    docker(['run', '-d', '--name', target, '--network', network, '--network-alias', 'campusos-target', targetImage]); createdTarget = true;
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      const result = spawnSync('docker', ['exec', target, 'node', '-e', "fetch('http://127.0.0.1:5117/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"], { timeout: 5000, stdio: 'ignore' });
      if (result.status === 0) { ready = true; break; }
      if (docker(['inspect', '--format', '{{.State.Running}}', target]) !== 'true') {
        console.error(docker(['logs', '--tail', '30', target], { stdio: 'inherit' }));
        throw new Error('Disposable target exited before readiness');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error('Disposable target readiness failed');
    const result = spawnSync('docker', ['run', '--rm', '--name', scanner, '--network', network,
      '-v', directory + ':/zap/wrk:rw', ZAP_IMAGE, 'zap.sh', '-cmd', '-autorun', '/zap/wrk/plan.yaml'], { stdio: 'inherit', timeout: 600000 });
    if (result.error || result.status !== 0) throw new Error('ZAP did not pass; exit=' + (result.status ?? 'unavailable'));
    const report = path.join(directory, 'zap-traditional-json.json');
    if (!fs.existsSync(report) || !fs.statSync(report).size) throw new Error('ZAP produced no JSON report');
    manifest.alertTypes = validateReport(JSON.parse(fs.readFileSync(report, 'utf8')));
    manifest.status = 'passed';
  } catch (error) { manifest.status = 'failed'; manifest.error = error.message; throw error; }
  finally {
    for (const name of [scanner, ...(createdTarget ? [target] : [])]) spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore', timeout: 15000 });
    if (createdNetwork) spawnSync('docker', ['network', 'rm', network], { stdio: 'ignore', timeout: 15000 });
    if (builtImage) spawnSync('docker', ['image', 'rm', targetImage], { stdio: 'ignore', timeout: 15000 });
    manifest.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(directory, 'run.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log('ZAP reports: ' + directory);
  }
}
if (require.main === module) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { validateInvocation, automationPlan, validateReport };
