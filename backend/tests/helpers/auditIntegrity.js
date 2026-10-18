const assert = require('node:assert/strict');
module.exports = async db => {
  const service = require('../../services/auditIntegrityService');
  const { logSystemAudit } = require('../../utils/platformOps');
  assert.equal((await service.verifyAuditChain()).status, 'not-initialized');
  const legacy = await logSystemAudit({ entityType: 'test', action: 'legacy', summary: 'Before initialization' });
  await Promise.all([
    service.initializeAuditChain(),
    service.updateLegacyAudit('system_audit_log', 'UPDATE system_audit_log SET summary = ? WHERE id = ?', ['Concurrent seed-style update', legacy.id])
  ]);
  assert.equal((await service.verifyAuditChain()).status, 'unanchored');
  await assert.rejects(service.initializeAuditChain());
  const checkpoint = (await service.verifyAuditChain()).checkpoint;
  assert.equal((await service.verifyAuditChain({ checkpoint })).status, 'anchored-prefix-valid');
  await Promise.all(Array.from({ length: 8 }, (_, index) => logSystemAudit({ entityType: 'test', action: 'append', summary: `Concurrent ${index}` })));
  const latest = await service.verifyAuditChain({ checkpoint });
  assert.equal(latest.status, 'anchored-prefix-valid');
  assert.equal(latest.tailCount, 8);
  const row = await db.get('SELECT * FROM system_audit_log ORDER BY id DESC LIMIT 1');
  await db.run('UPDATE system_audit_log SET summary = ? WHERE id = ?', ['Tampered', row.id]);
  assert.equal((await service.verifyAuditChain({ checkpoint })).status, 'violation');
  await db.run('UPDATE system_audit_log SET summary = ? WHERE id = ?', [row.summary, row.id]);
  assert.equal((await service.verifyAuditChain({ checkpoint })).status, 'anchored-prefix-valid');
  for (const [table, field, replacement] of [['grade_audit_log', 'new_grade', 99], ['attendance_audit_log', 'new_status', 'absent']]) {
    const original = await db.get(`SELECT * FROM ${table} LIMIT 1`);
    if (!original) continue;
    const changed = original[field] === replacement ? (field === 'new_grade' ? 98 : 'present') : replacement;
    await db.run(`UPDATE ${table} SET ${field} = ? WHERE id = ?`, [changed, original.id]);
    assert.equal((await service.verifyAuditChain({ checkpoint })).status, 'violation');
    await db.run(`UPDATE ${table} SET ${field} = ? WHERE id = ?`, [original[field], original.id]);
  }
  const headBefore = await db.get('SELECT sequence FROM audit_integrity_head WHERE id = 1');
  const countBefore = await db.get('SELECT COUNT(*) AS count FROM system_audit_log');
  const originalRun = db.run;
  db.run = async (sql, params) => {
    if (/INSERT INTO audit_integrity_entries/.test(sql)) throw new Error('Injected chain failure');
    return originalRun(sql, params);
  };
  try { await assert.rejects(logSystemAudit({ entityType: 'test', action: 'rollback', summary: 'Must roll back' })); }
  finally { db.run = originalRun; }
  assert.equal(Number((await db.get('SELECT sequence FROM audit_integrity_head WHERE id = 1')).sequence), Number(headBefore.sequence));
  assert.equal(Number((await db.get('SELECT COUNT(*) AS count FROM system_audit_log')).count), Number(countBefore.count));
  const [duringWrite] = await Promise.all([
    service.verifyAuditChain({ checkpoint }),
    logSystemAudit({ entityType: 'test', action: 'snapshot', summary: 'Snapshot-safe append' })
  ]);
  assert.equal(duringWrite.status, 'anchored-prefix-valid');
  const actor = await db.run('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
    ['audit-retention-test@example.org', 'not-a-login-credential', 'Retained audit actor', 'student']);
  const actorEvent = await logSystemAudit({ entityType: 'test', action: 'actor-retention', summary: 'Actor identifier must survive', changedBy: actor.id });
  await db.run('DELETE FROM users WHERE id = ?', [actor.id]);
  assert.equal(Number((await db.get('SELECT changed_by FROM system_audit_log WHERE id = ?', [actorEvent.id])).changed_by), Number(actor.id));
  assert.equal((await service.verifyAuditChain({ checkpoint })).status, 'anchored-prefix-valid');
  const extra = await db.run('INSERT INTO system_audit_log (entity_type, action, summary) VALUES (?, ?, ?)', ['test', 'untracked', 'Direct untracked write']);
  assert.equal((await service.verifyAuditChain({ checkpoint })).status, 'violation');
  await db.run('DELETE FROM system_audit_log WHERE id = ?', [extra.id]);
  const exam = await db.get('SELECT exam_id FROM grade_audit_log LIMIT 1');
  const schedule = await db.get('SELECT schedule_id FROM attendance_audit_log LIMIT 1');
  const grades = await db.get('SELECT COUNT(*) AS count FROM grade_audit_log');
  const attendance = await db.get('SELECT COUNT(*) AS count FROM attendance_audit_log');
  if (exam) await db.run('DELETE FROM exams WHERE id = ?', [exam.exam_id]);
  if (schedule) {
    await db.run('DELETE FROM attendance WHERE schedule_id = ?', [schedule.schedule_id]);
    await db.run('DELETE FROM schedule WHERE id = ?', [schedule.schedule_id]);
  }
  assert.equal(Number((await db.get('SELECT COUNT(*) AS count FROM grade_audit_log')).count), Number(grades.count));
  assert.equal(Number((await db.get('SELECT COUNT(*) AS count FROM attendance_audit_log')).count), Number(attendance.count));
  assert.equal((await service.verifyAuditChain({ checkpoint })).status, 'anchored-prefix-valid');
  assert.equal((await service.verifyAuditChain({ checkpoint: { ...checkpoint, chainId: 'wrong' } })).status, 'violation');
  assert.equal((await service.verifyAuditChain({ checkpoint: { ...checkpoint, sequence: latest.checkpoint.sequence + 1 } })).status, 'violation');
  await db.run('DELETE FROM system_audit_log WHERE id = ?', [row.id]);
  assert.equal((await service.verifyAuditChain({ checkpoint })).status, 'violation');
};
