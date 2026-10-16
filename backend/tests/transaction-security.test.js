const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');

process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = ':memory:';
const db = require('../config/database');
const service = require('../services/attendanceService');
const { logGradeChange } = require('../utils/auditTrail');
const { logSystemAudit } = require('../utils/platformOps');
const admin = { id: 1, role: 'admin', email: 'admin@test' };
const teacher = { id: 2, role: 'teacher', name: 'Original teacher', email: 'teacher@test' };
const input = { user: admin, scheduleId: 1, studentId: 'S1', date: '2026-10-16', status: 'present' };

before(async () => {
  await db.migrate();
  for (const [id, role, name, studentId] of [[1, 'admin', 'Admin', null], [2, 'teacher', teacher.name, null], [3, 'teacher', 'New teacher', null], [4, 'student', 'Student', 'S1'], [5, 'student', 'Student two', 'S2']]) {
    await db.run('INSERT INTO users (id, email, password, name, role, student_id, group_name) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, `${id}@test`, 'unused', name, role, studentId, 'G']);
  }
  await db.run("INSERT INTO courses (id, code, name, teacher_id) VALUES (1, 'C1', 'Course', 2)");
  await db.run("INSERT INTO course_enrollments (course_id, student_id) VALUES (1, 4), (1, 5)");
  await db.run("INSERT INTO schedule (id, day, time_slot, group_name, subject, teacher, course_id) VALUES (1, 'Friday', '10:00', 'G', 'Subject', ?, 1)", [teacher.name]);
  await db.run("INSERT INTO exams (id, group_name, subject, exam_date, exam_time) VALUES (1, 'G', 'Subject', '2026-10-16', '10:00')");
});
after(async () => db.close());

test('attendance audit failure rolls back the whole batch', async () => {
  await db.run("CREATE TRIGGER reject_attendance_audit BEFORE INSERT ON attendance_audit_log WHEN NEW.student_id = 'S2' BEGIN SELECT RAISE(ABORT, 'audit failure'); END");
  await assert.rejects(service.saveAttendanceBatch({ ...input, records: [{ studentId: 'S1', status: 'present' }, { studentId: 'S2', status: 'absent' }] }), /audit failure/);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM attendance')).n, 0);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM attendance_audit_log')).n, 0);
  await db.run('DROP TRIGGER reject_attendance_audit');
});

test('system audit failure rolls back attendance and academic audit', async () => {
  await db.run("CREATE TRIGGER reject_system_audit BEFORE INSERT ON system_audit_log BEGIN SELECT RAISE(ABORT, 'system audit failure'); END");
  await assert.rejects(service.saveAttendanceRecord(input), /system audit failure/);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM attendance')).n, 0);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM attendance_audit_log')).n, 0);
  await db.run('DROP TRIGGER reject_system_audit');
});

test('concurrent attendance writes preserve the previous-value audit chain', async () => {
  await Promise.all(['present', 'absent', 'late'].map(status => service.saveAttendanceRecord({ ...input, status })));
  const audit = await db.all('SELECT previous_status, new_status FROM attendance_audit_log ORDER BY id');
  assert.deepEqual(audit, [
    { previous_status: null, new_status: 'present' },
    { previous_status: 'present', new_status: 'absent' },
    { previous_status: 'absent', new_status: 'late' }
  ]);
  assert.equal((await db.get('SELECT status FROM attendance')).status, 'late');
  assert.equal((await db.get("SELECT COUNT(*) AS n FROM system_audit_log WHERE entity_type = 'attendance'")).n, 3);
});

test('grade audit failure rolls back a grade on the transaction executor', async () => {
  await db.run("CREATE TRIGGER reject_grade_audit BEFORE INSERT ON grade_audit_log BEGIN SELECT RAISE(ABORT, 'grade audit failure'); END");
  await assert.rejects(db.transaction(async tx => {
    const grade = await tx.run('INSERT INTO grades (exam_id, student_id, grade, graded_by) VALUES (?, ?, ?, ?)', [1, 'S1', 80, 1]);
    await logGradeChange({ gradeId: grade.id, examId: 1, studentId: 'S1', newGrade: 80, changedBy: 1 }, tx);
    await logSystemAudit({ entityType: 'grade', action: 'create', summary: 'Created grade' }, tx);
  }), /grade audit failure/);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM grades')).n, 0);
  await db.run('DROP TRIGGER reject_grade_audit');
});

test('grade route rolls back its write and academic audit when system audit fails', async () => {
  await db.run("INSERT INTO exam_students (exam_id, student_id) VALUES (1, 'S1')");
  await db.run("CREATE TRIGGER reject_grade_system_audit BEFORE INSERT ON system_audit_log WHEN NEW.entity_type = 'grade' BEGIN SELECT RAISE(ABORT, 'grade system audit failure'); END");
  const router = require('../routes/grades');
  const route = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route;
  const handler = route.stack.at(-1).handle;
  let status = 200;
  const res = { status(value) { status = value; return this; }, json() {} };
  await handler({ body: { examId: 1, studentId: 'S1', grade: 90, comments: 'Atomic grade' }, user: admin }, res);
  assert.equal(status, 500);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM grades')).n, 0);
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM grade_audit_log')).n, 0);
  await db.run('DROP TRIGGER reject_grade_system_audit');
});

test('course reassignment revokes attendance writes and all management reads despite matching display name', async () => {
  assert.equal((await service.listManagementSessions({ user: teacher, date: input.date })).sessions.length, 1);
  await db.run('UPDATE courses SET teacher_id = 3 WHERE id = 1');
  await assert.rejects(service.saveAttendanceRecord({ ...input, user: teacher }), error => error.message === 'Access denied');
  await assert.rejects(service.saveAttendanceBatch({ ...input, user: teacher, records: [{ studentId: 'S1', status: 'absent' }] }), /Access denied/);
  await assert.rejects(service.getManagementSession({ ...input, user: teacher }), /Access denied/);
  assert.deepEqual((await service.listManagementSessions({ user: teacher, date: input.date })).sessions, []);
  assert.deepEqual((await service.getAttendanceAudit({ user: teacher })).audit, []);
  assert.equal((await service.getAttendanceAnalytics({ user: teacher, from: input.date, to: input.date })).summary.totalRecords, 0);
  await db.run('UPDATE schedule SET course_id = NULL WHERE id = 1');
  await assert.rejects(service.saveAttendanceRecord({ ...input, user: teacher }), /Access denied/);
  assert.deepEqual((await service.listManagementSessions({ user: teacher, date: input.date })).sessions, []);
});

test('grade checks stay inside the transaction and return denial statuses', async () => {
  const router = require('../routes/grades');
  const handler = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack.at(-1).handle;
  await db.run('UPDATE exams SET course_id = 1, created_by = 2 WHERE id = 1');
  const originalGet = db.get;
  const originalTransaction = db.transaction;
  let transactionActive = false;
  let transactionReads = 0;
  db.transaction = callback => originalTransaction.call(db, async tx => {
    transactionActive = true;
    try { return await callback(tx); }
    finally { transactionActive = false; }
  });
  db.get = (...args) => {
    if (!transactionActive) throw new Error('Authorization read escaped the transaction');
    transactionReads += 1;
    return originalGet.apply(db, args);
  };
  try {
    const invoke = async (user, examId, studentId) => {
      let status = 200;
      await handler({ user, body: { examId, studentId, grade: 85 } }, {
        status(value) { status = value; return this; }, json() {}
      });
      return status;
    };
    assert.equal(await invoke(teacher, 1, 'S1'), 403);
    assert.equal(await invoke(admin, 1, 'not-enrolled'), 400);
    assert.equal(await invoke(admin, 99999, 'S1'), 404);
    assert.ok(transactionReads >= 3, 'Authorization must execute database reads within the transaction');
  } finally {
    db.get = originalGet;
    db.transaction = originalTransaction;
  }
  assert.equal((await db.get('SELECT COUNT(*) AS n FROM grades')).n, 0);
});
