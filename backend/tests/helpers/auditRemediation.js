const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

// Shared by SQLite API tests and the real PostgreSQL integration suite.
module.exports = async function verifyAuditRemediation({ request, login, db, authHeaders }) {
  const teacher = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const other = await login('askar.eskendirov@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const admin = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const student = await login('240141052', process.env.SEED_STUDENT_PASSWORD);
  const call = (session, route, method = 'GET', body) => request(route, {
    method, headers: authHeaders(session.token), ...(body ? { body: JSON.stringify(body) } : {})
  });
  const profile = (await call(student, '/api/users/profile/me')).body.user;
  assert.equal((await call(student, '/api/users/profile/me', 'PUT', { ...profile, phone: 'full-profile-client' })).response.status, 200);
  for (const route of ['/api/users/profile/me', '/api/users/' + student.user.id]) {
    for (const change of [{ group_name: 'FORGED' }, { balance_info: '0', study_status: 'graduated' }, { role: 'admin' }, { session_version: 999 }]) {
      assert.equal((await call(student, route, 'PUT', { ...profile, ...change })).response.status, 403);
    }
    assert.equal((await call(student, route, 'PUT', { phone: '+996-test' })).response.status, 200);
    assert.equal((await call(student, '/api/users/profile/me')).body.user.group_name, profile.group_name);
  }
  assert.equal((await call(admin, '/api/users/' + student.user.id, 'PUT', { advisor: 'Test advisor' })).response.status, 200);
  assert.equal((await call(student, '/api/users/profile/me')).body.user.group_name, profile.group_name);

  const foreign = await db.get('SELECT s.* FROM schedule s JOIN courses c ON c.id = s.course_id WHERE c.teacher_id = ?', [other.user.id]);
  const foreignRoute = '/api/attendance/management/session/' + foreign.id + '?date=2099-10-16';
  const own = await db.get('SELECT s.* FROM schedule s JOIN courses c ON c.id = s.course_id WHERE c.teacher_id = ?', [teacher.user.id]);
  for (const name of [other.user.name, other.user.email]) {
    assert.equal((await call(teacher, '/api/users/profile/me', 'PUT', { name })).response.status, 200);
    assert.equal((await call(teacher, foreignRoute)).response.status, 403);
    assert.equal((await call(teacher, '/api/attendance', 'POST', { scheduleId: foreign.id, studentId: '240141052', date: '2099-10-16', status: 'present' })).response.status, 403);
    const sessions = await call(teacher, '/api/attendance/management/sessions?date=2099-10-16');
    assert.ok(!sessions.body.sessions.some(row => row.id === foreign.id));
  }
  assert.equal((await call(teacher, '/api/attendance/management/session/' + own.id)).response.status, 200);
  const foreignHistory = await db.get('SELECT * FROM attendance WHERE schedule_id = ?', [foreign.id]);
  assert.ok(foreignHistory);
  const history = await call(teacher, '/api/attendance/student/' + foreignHistory.student_id);
  assert.ok(!history.body.attendance.some(row => row.schedule_id === foreign.id));
  await call(teacher, '/api/users/profile/me', 'PUT', { name: teacher.user.name });

  const foreignAssignment = await db.get('SELECT a.id FROM assignments a WHERE a.course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM course_enrollments ce WHERE ce.course_id = a.course_id AND ce.student_id = ?)', [student.user.id]);
  assert.ok(foreignAssignment);
  assert.ok(!(await call(student, '/api/assignments')).body.assignments.some(row => row.id === foreignAssignment.id));
  const ownedAssignments = (await call(teacher, '/api/assignments')).body.assignments;
  assert.ok(ownedAssignments.length > 0);
  assert.ok(ownedAssignments.every(row => row.course_teacher_id === teacher.user.id));
  assert.ok((await call(student, '/api/assignments')).body.assignments.length > 0);
  const unlinked = await db.run('INSERT INTO assignments (title, created_by, due_date) VALUES (?, ?, ?)', ['Unlinked admin assignment', admin.user.id, '2099-10-16']);
  for (const session of [student, teacher]) {
    assert.ok(!(await call(session, '/api/assignments')).body.assignments.some(row => row.id === unlinked.id));
  }
  assert.ok((await call(admin, '/api/assignments')).body.assignments.some(row => row.id === unlinked.id));

  const data = { courseId: own.course_id, subject: 'Atomic audit regression', group_name: 'CYB-23', exam_date: '2099-10-16', exam_time: '10:00', students: ['240141052'] };
  const created = await call(teacher, '/api/exams', 'POST', data);
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const exam = created.body.exam;
  const grade = { examId: exam.id, studentId: '240141052', grade: 77 };
  const injectFailure = async (pattern, action, occurrence = 1) => {
    const original = db.run;
    let seen = 0;
    db.run = async (sql, params) => {
      if (pattern.test(sql) && ++seen === occurrence) throw new Error('Intentional audit failure');
      return original.call(db, sql, params);
    };
    try { assert.equal((await action()).response.status, 500); }
    finally { db.run = original; }
  };
  for (const pattern of [/INSERT INTO grade_audit_log/, /INSERT INTO system_audit_log/]) {
    await injectFailure(pattern, () => call(teacher, '/api/grades', 'POST', grade));
    assert.equal(await db.get('SELECT * FROM grades WHERE exam_id = ?', [exam.id]), undefined);
    assert.equal(Number((await db.get('SELECT COUNT(*) AS n FROM grade_audit_log WHERE exam_id = ?', [exam.id])).n), 0);
  }
  assert.equal((await call(teacher, '/api/grades', 'POST', grade)).response.status, 200);
  await injectFailure(/INSERT INTO grade_audit_log/, () => call(teacher, '/api/grades', 'POST', { ...grade, grade: 20 }));
  assert.equal((await db.get('SELECT grade FROM grades WHERE exam_id = ?', [exam.id])).grade, 77);
  const concurrent = await Promise.all([81, 92].map(value => call(teacher, '/api/grades', 'POST', { ...grade, grade: value })));
  assert.ok(concurrent.every(result => result.response.status === 200));
  const trail = await db.all('SELECT * FROM grade_audit_log WHERE exam_id = ? ORDER BY id', [exam.id]);
  assert.equal(trail.length, 3);
  assert.equal(trail[1].previous_grade, 77);
  assert.equal(trail[2].previous_grade, trail[1].new_grade);
  assert.equal((await db.get('SELECT grade FROM grades WHERE exam_id = ?', [exam.id])).grade, trail[2].new_grade);

  await injectFailure(/INSERT INTO exam_students/, () => call(teacher, '/api/exams/' + exam.id, 'PUT', { ...data, subject: 'Must rollback' }));
  assert.equal((await db.get('SELECT subject FROM exams WHERE id = ?', [exam.id])).subject, data.subject);
  assert.deepEqual((await db.all('SELECT student_id FROM exam_students WHERE exam_id = ?', [exam.id])).map(row => row.student_id), data.students);
  await injectFailure(/INSERT INTO system_audit_log/, () => call(teacher, '/api/exams', 'POST', { ...data, subject: 'Failed creation' }));
  assert.equal(await db.get('SELECT id FROM exams WHERE subject = ?', ['Failed creation']), undefined);

  const session = (await call(teacher, '/api/attendance/management/session/' + own.id + '?date=2099-10-16')).body;
  assert.ok(session.students.length >= 2);
  const attendanceBody = { scheduleId: own.id, date: '2099-10-16', records: session.students.slice(0, 2).map(row => ({ studentId: row.student_id, status: 'present' })) };
  await injectFailure(/INSERT INTO attendance_audit_log/, () => call(teacher, '/api/attendance/bulk', 'POST', attendanceBody), 2);
  assert.equal(Number((await db.get('SELECT COUNT(*) AS n FROM attendance WHERE schedule_id = ? AND date = ?', [own.id, attendanceBody.date])).n), 0);
  assert.equal((await call(teacher, '/api/attendance/bulk', 'POST', attendanceBody)).response.status, 200);
  const singleBody = { scheduleId: own.id, date: attendanceBody.date, studentId: session.students[0].student_id, status: 'absent' };
  await injectFailure(/INSERT INTO system_audit_log/, () => call(teacher, '/api/attendance', 'POST', singleBody));
  assert.equal((await db.get('SELECT status FROM attendance WHERE schedule_id = ? AND student_id = ? AND date = ?', [own.id, singleBody.studentId, singleBody.date])).status, 'present');
  const marks = await Promise.all(['late', 'absent'].map(status => call(teacher, '/api/attendance', 'POST', { ...singleBody, status })));
  assert.ok(marks.every(result => result.response.status === 200));
  const attendanceTrail = await db.all('SELECT * FROM attendance_audit_log WHERE schedule_id = ? AND student_id = ? AND date = ? ORDER BY id', [own.id, singleBody.studentId, singleBody.date]);
  assert.equal(attendanceTrail.length, 3);
  assert.equal(attendanceTrail[1].previous_status, 'present');
  assert.equal(attendanceTrail[2].previous_status, attendanceTrail[1].new_status);
  await db.run('UPDATE courses SET teacher_id = ? WHERE id = ?', [other.user.id, own.course_id]);
  assert.equal((await call(teacher, '/api/attendance/management/session/' + own.id)).response.status, 403);
  assert.equal((await call(other, '/api/attendance/management/session/' + own.id)).response.status, 200);
  await db.run('UPDATE courses SET teacher_id = ? WHERE id = ?', [teacher.user.id, own.course_id]);
  await db.run('UPDATE schedule SET course_id = NULL WHERE id = ?', [own.id]);
  assert.equal((await call(teacher, '/api/attendance/management/session/' + own.id)).response.status, 403);
  assert.equal((await call(admin, '/api/attendance/management/session/' + own.id)).response.status, 200);
  await db.run('UPDATE schedule SET course_id = ? WHERE id = ?', [own.course_id, own.id]);

  // A nontransactional operation must not accidentally join a SQLite rollback.
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const resume = new Promise(resolve => { release = resolve; });
  const failing = db.transaction(async () => { entered(); await resume; throw new Error('rollback isolation'); });
  const rejected = assert.rejects(failing, /rollback isolation/);
  await started;
  const independent = db.run('UPDATE users SET phone = ? WHERE id = ?', ['independent-write', student.user.id]);
  release();
  await rejected;
  await independent;
  assert.equal((await db.get('SELECT phone FROM users WHERE id = ?', [student.user.id])).phone, 'independent-write');

  const passwordPayload = { currentPassword: process.env.SEED_STUDENT_PASSWORD, newPassword: 'AuditChanged123!' };
  await injectFailure(/INSERT INTO system_audit_log/, () => call(student, '/api/auth/password', 'PUT', passwordPayload));
  assert.equal((await call(student, '/api/auth/me')).response.status, 200);
  await login('240141052', process.env.SEED_STUDENT_PASSWORD);
  const changed = await call(student, '/api/auth/password', 'PUT', passwordPayload);
  assert.equal(changed.response.status, 200);
  assert.equal((await call(student, '/api/auth/me')).response.status, 401);
  assert.equal((await request('/api/auth/me', { headers: { Cookie: 'campusos_session=' + student.token } })).response.status, 401);
  assert.equal(changed.body.token, undefined, 'Password changes must require fresh authentication');
  const fresh = await login('240141052', passwordPayload.newPassword);
  assert.equal((await call(fresh, '/api/auth/me')).response.status, 200);
  const legacy = jwt.sign({ id: student.user.id, role: 'student' }, process.env.JWT_SECRET);
  assert.equal((await call({ token: legacy }, '/api/auth/me')).response.status, 401);
  const renewed = await login('240141052', 'AuditChanged123!');
  for (const is_active of [false, true]) {
    assert.equal((await call(admin, '/api/users/' + student.user.id + '/status', 'PATCH', { is_active })).response.status, 200);
  }
  assert.equal((await call(renewed, '/api/auth/me')).response.status, 401);
  const beforeReseed = await login('240141052', 'AuditChanged123!');
  await require('../../seeds/seedOperations').seedUsers();
  assert.equal((await call(beforeReseed, '/api/auth/me')).response.status, 401);
  await login('240141052', process.env.SEED_STUDENT_PASSWORD);
};
