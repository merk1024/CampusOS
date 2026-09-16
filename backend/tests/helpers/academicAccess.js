const assert = require('node:assert/strict');

module.exports = async function verifyAcademicAccess({ request, login, db, authHeaders }) {
  const before = await db.get('SELECT COUNT(*) AS count FROM users');
  for (const role of ['student', 'teacher', 'admin']) {
    const result = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({
      email: 'unauthorized-' + role + '@example.test', password: 'Unauthorized123!', name: 'Unauthorized', role
    }) });
    assert.equal(result.response.status, 403, 'Self registration: ' + role);
    assert.equal(result.response.headers.get('set-cookie'), null);
  }
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM users')).count, before.count);
  const teacher = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const other = await login('askar.eskendirov@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const admin = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const student = await login('240141052', process.env.SEED_STUDENT_PASSWORD);
  const data = { group_name: 'CYB-23', subject: 'Access regression', exam_date: '2026-10-20',
    exam_time: '10:00', room: 'A-201', students: ['240141052'] };
  const created = await request('/api/exams', { method: 'POST', headers: authHeaders(teacher.token), body: JSON.stringify(data) });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const examId = created.body.exam.id;
  const ownExams = await request('/api/exams', { headers: authHeaders(teacher.token) });
  const ownExam = ownExams.body.exams.find(row => row.id === examId);
  assert.equal(ownExam.exam_date, '2026-10-20');
  assert.equal(ownExam.roster[0].student_id, '240141052');
  const studentExams = await request('/api/exams', { headers: authHeaders(student.token) });
  assert.ok(studentExams.body.exams.every(row => !row.roster && row.students.every(id => id === '240141052')));
  const payload = { examId, studentId: '240141052', grade: 84, comments: 'Access test' };
  const save = (session, body) => request('/api/grades', { method: 'POST', headers: authHeaders(session.token), body: JSON.stringify(body) });
  assert.equal((await save(other, payload)).response.status, 403);
  assert.equal((await save(student, payload)).response.status, 403);
  assert.equal((await save(teacher, {...payload, studentId: 'not-in-roster'})).response.status, 400);
  for (const grade of [-1, 101, 3.5, null, '85']) {
    assert.equal((await save(teacher, {...payload, grade})).response.status, 400);
  }
  assert.equal((await save(teacher, payload)).response.status, 200);
  assert.equal((await save(teacher, {...payload, grade: 91})).response.status, 200);
  const audit = await request('/api/grades/audit?examId=' + examId, { headers: authHeaders(teacher.token) });
  assert.equal(audit.response.status, 200);
  assert.equal(audit.body.audit.length, 2);
  assert.ok(audit.body.audit.some(row => Number(row.previous_grade) === 84 && Number(row.new_grade) === 91));
  const foreignAudit = await request('/api/grades/audit?examId=' + examId, { headers: authHeaders(other.token) });
  assert.deepEqual(foreignAudit.body.audit, []);
  const otherExams = await request('/api/exams', { headers: authHeaders(other.token) });
  assert.ok(!otherExams.body.exams.some(row => row.id === examId));
  const otherGrades = await request('/api/grades/student/240141052', { headers: authHeaders(other.token) });
  assert.ok(!otherGrades.body.grades.some(row => row.exam_id === examId));
  assert.equal((await request('/api/grades/student/another-student', { headers: authHeaders(student.token) })).response.status, 403);
  for (const method of ['PUT', 'DELETE']) {
    assert.equal((await request('/api/exams/' + examId, {
      method, headers: authHeaders(other.token), body: method === 'PUT' ? JSON.stringify(data) : undefined
    })).response.status, 403);
  }
  assert.equal((await db.get('SELECT grade FROM grades WHERE exam_id = ?', [examId])).grade, 91);
  assert.equal((await save(admin, {...payload, grade: 92})).response.status, 200);

  // A course reassignment must revoke the original creator's access.
  const course = await db.get('SELECT id FROM courses WHERE teacher_id = ?', [other.user.id]);
  assert.ok(course);
  await db.run('UPDATE exams SET course_id = ? WHERE id = ?', [course.id, examId]);
  assert.equal((await save(teacher, payload)).response.status, 403);
  assert.equal((await save(other, payload)).response.status, 200);

  const schedule = await db.get('SELECT * FROM schedule WHERE course_id = ?', [course.id]);
  assert.ok(schedule);
  assert.equal((await request('/api/schedule/' + schedule.id, { method: 'DELETE', headers: authHeaders(teacher.token) })).response.status, 403);
  const scheduleBody = {day: 'Monday', time_slot:'10:00-11:00', group_name: 'CYB-23', subject:'Foreign course', courseId: course.id, course_id: course.id};
  assert.equal((await request('/api/schedule', { method: 'POST', headers: authHeaders(teacher.token), body: JSON.stringify(scheduleBody) })).response.status, 403);
};
