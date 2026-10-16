const assert = require('node:assert/strict');

module.exports = async function verifyExamSecurity({ request, db, authHeaders, teacher, other, admin, data, examId }) {
  const send = (session, body, id) => request('/api/exams' + (id ? '/' + id : ''), {
    method: id ? 'PUT' : 'POST', headers: authHeaders(session.token), body: JSON.stringify(body)
  });
  const foreign = await db.get('SELECT id FROM courses WHERE teacher_id = ?', [other.user.id]);
  assert.ok(foreign);
  const outsider = await db.get(`SELECT u.student_id FROM users u WHERE u.role = 'student'
    AND u.student_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM course_enrollments ce
      WHERE ce.student_id = u.id AND ce.course_id = ?)`, [data.course_id]);
  assert.ok(outsider, 'Seed must contain a student outside the course');
  const { course_id: courseId, ...legacy } = data;
  const originalTransaction = db.transaction;
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const beforeExam = await db.get('SELECT * FROM exams WHERE id = ?', [examId]);
    const beforeRoster = await db.all('SELECT * FROM exam_students WHERE exam_id = ?', [examId]);
    const beforeAudit = await db.get("SELECT COUNT(*) AS count FROM system_audit_log WHERE entity_type = 'exam'", []);
    let injected = false;
    db.transaction = async (callback) => {
      if (!injected) {
        injected = true;
        await db.run('UPDATE courses SET teacher_id = ? WHERE id = ?', [other.user.id, courseId]);
      }
      return originalTransaction.call(db, callback);
    };
    try {
      const denied = await request('/api/exams' + (method === 'POST' ? '' : '/' + examId), {
        method, headers: authHeaders(teacher.token),
        body: method === 'DELETE' ? undefined : JSON.stringify({ ...data, subject: 'Stale authorization' })
      });
      assert.ok(injected, 'Mutation must authorize inside a transaction');
      assert.equal(denied.response.status, 403, JSON.stringify(denied.body));
      assert.deepEqual(await db.get('SELECT * FROM exams WHERE id = ?', [examId]), beforeExam);
      assert.deepEqual(await db.all('SELECT * FROM exam_students WHERE exam_id = ?', [examId]), beforeRoster);
      assert.deepEqual(await db.get("SELECT COUNT(*) AS count FROM system_audit_log WHERE entity_type = 'exam'", []), beforeAudit);
    } finally {
      db.transaction = originalTransaction;
      await db.run('UPDATE courses SET teacher_id = ? WHERE id = ?', [teacher.user.id, courseId]);
    }
  }
  for (const id of [undefined, examId]) {
    for (const body of [
      { ...data, course_id: null },
      { ...data, course_id: foreign.id },
      { ...data, students: [outsider.student_id] },
      { ...data, course_id: courseId, courseId: foreign.id }
    ]) {
      assert.ok([400, 403].includes((await send(teacher, body, id)).response.status));
    }
  }
  assert.equal((await send(teacher, legacy)).response.status, 403);
  assert.equal((await send(teacher, legacy, examId)).response.status, 200);
  assert.equal(Number((await db.get('SELECT course_id FROM exams WHERE id = ?', [examId])).course_id), Number(courseId));
  assert.deepEqual((await db.all('SELECT student_id FROM exam_students WHERE exam_id = ?', [examId])).map(row => row.student_id), data.students);
  const camel = await send(teacher, { ...legacy, courseId });
  assert.equal(camel.response.status, 201, JSON.stringify(camel.body));
  assert.equal(Number(camel.body.exam.course_id), Number(courseId));
  const adminLegacy = await send(admin, legacy);
  assert.equal(adminLegacy.response.status, 201, JSON.stringify(adminLegacy.body));
  assert.equal(adminLegacy.body.exam.course_id, null);
  for (const id of [camel.body.exam.id, adminLegacy.body.exam.id]) {
    assert.equal((await request('/api/exams/' + id, { method: 'DELETE', headers: authHeaders(admin.token) })).response.status, 200);
  }
};
