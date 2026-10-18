const test = require('node:test');
const assert = require('node:assert/strict');
const { auditDigest, chainDigest } = require('../security/auditDigest');
test('versioned audit digests normalize SQL timestamp representations and bind every field', () => {
  const record = { id: 1, entity_type: 'auth', entity_id: '2', action: 'login', summary: 'Sign in', details: '{"b":2,"a":1}', changed_by: 2, request_id: 'request', created_at: '2026-10-18 12:00:00' };
  const hash = auditDigest('system_audit_log', record);
  assert.equal(hash, auditDigest('system_audit_log', { ...record, created_at: new Date('2026-10-18T12:00:00Z') }));
  assert.notEqual(hash, auditDigest('system_audit_log', { ...record, details: '{"a":1,"b":2}' }));
  assert.notEqual(auditDigest('system_audit_log', { ...record, details: '{"n":9007199254740992}' }),
    auditDigest('system_audit_log', { ...record, details: '{"n":9007199254740993}' }));
  for (const field of Object.keys(record)) assert.notEqual(hash, auditDigest('system_audit_log', { ...record, [field]: field === 'id' || field === 'changed_by' ? 9 : field === 'created_at' ? '2026-10-18 13:00:00' : 'changed' }));
  assert.throws(() => auditDigest('users', record));
  const entry = { chainId: 'chain', sequence: 1, source: 'system_audit_log', recordId: 1, payloadHash: hash, previousHash: '0'.repeat(64) };
  assert.notEqual(chainDigest(entry), chainDigest({ ...entry, sequence: 2 }));
});
