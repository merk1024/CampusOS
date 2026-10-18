const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInvocation, automationPlan, validateReport } = require('../../scripts/security/run-zap');
test('ZAP runner refuses external targets and command-line overrides', () => {
  assert.throws(() => validateInvocation(['https://example.org'], {}));
  assert.throws(() => validateInvocation([], { ZAP_TARGET_URL: 'https://example.org' }));
  assert.throws(() => validateInvocation([], { ZAP_TARGET_URL: 'http://localhost:5000' }));
  assert.doesNotThrow(() => validateInvocation([], {}));
});
test('empty, wrong-target and elevated-risk ZAP reports cannot pass', () => {
  assert.throws(() => validateReport({}));
  assert.throws(() => validateReport({ site: [] }));
  assert.throws(() => validateReport({ site: [{ '@host': 'example.org', '@port': '5117', alerts: [] }] }));
  assert.throws(() => validateReport({ site: [{ '@host': 'campusos-target', '@port': '5117', alerts: [{ riskcode: '2' }] }] }));
  assert.deepEqual(validateReport({ site: [{ '@host': 'campusos-target', '@port': '5117', alerts: [] }] }), { high: 0, medium: 0, low: 0, informational: 0 });
});
test('ZAP plan has fixed disposable targets, expected responses and fail-closed exit rules', () => {
  const plan = automationPlan();
  assert.equal(plan.env.parameters.failOnError, true);
  assert.equal(plan.env.parameters.failOnWarning, true);
  assert.ok(!plan.jobs.some(job => /activeScan|spider|script|replacer/.test(job.type)));
  const requests = plan.jobs.find(job => job.type === 'requestor').requests;
  assert.ok(requests.length >= 8);
  for (const request of requests) {
    assert.equal(new URL(request.url).origin, 'http://campusos-target:5117');
    assert.ok(Number.isInteger(request.responseCode));
  }
  assert.ok(requests.some(request => request.responseCode === 401));
  assert.ok(requests.some(request => request.responseCode === 403));
  const exit = plan.jobs.at(-1);
  assert.equal(exit.type, 'exitStatus');
  assert.equal(exit.parameters.errorLevel, 'High');
  assert.equal(exit.parameters.warnLevel, 'Medium');
  assert.notEqual(exit.parameters.errorExitValue, 0);
  assert.notEqual(exit.parameters.warnExitValue, 0);
});
