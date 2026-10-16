const assert = require('node:assert/strict');

module.exports = async function verifyContentSecurity({ request, login, db, authHeaders }) {
  const teacher = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const other = await login('askar.eskendirov@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const student = await login('240141052', process.env.SEED_STUDENT_PASSWORD);
  const course = await db.run('INSERT INTO courses (code, name, teacher_id) VALUES (?, ?, ?)',
    ['CONTENT-' + Date.now(), 'Content security regression', teacher.user.id]);
  const send = (route, session, method = 'GET', body) => request(route, {
    method, headers: authHeaders(session.token), body: body ? JSON.stringify(body) : undefined
  });
  const announcementIds = [];
  const assignmentIds = [];
  try {
    const assignmentData = { title: 'Unrelated assignment', courseId: course.id, dueDate: '2026-10-20T10:00:00Z' };
    for (const dueDate of [undefined, null, '', 'invalid', '2026-02-30', '2026-13-01', '2026-10-20T25:00']) {
      assert.equal((await send('/api/assignments', teacher, 'POST', { ...assignmentData, dueDate })).response.status, 400,
        'Invalid due date must return 400: ' + dueDate);
    }
    for (const maxGrade of [null, '', 0, -1, 1001, 1.5, 'invalid', true]) {
      assert.equal((await send('/api/assignments', teacher, 'POST', { ...assignmentData, maxGrade })).response.status, 400,
        'Invalid max grade must return 400: ' + maxGrade);
    }
    assert.equal((await send('/api/assignments', other, 'POST', assignmentData)).response.status, 403);
    const assignment = await send('/api/assignments', teacher, 'POST', assignmentData);
    assert.equal(assignment.response.status, 201);
    assignmentIds.push(assignment.body.assignment.id);
    assert.equal(assignment.body.assignment.max_grade, 100);
    const ownAssignments = await send('/api/assignments', teacher);
    assert.equal(ownAssignments.response.status, 200);
    assert.ok(ownAssignments.body.assignments.some(row => Number(row.id) === Number(assignment.body.assignment.id)));
    for (const session of [student, other]) {
      const listed = await send('/api/assignments', session);
      assert.equal(listed.response.status, 200);
      assert.ok(!listed.body.assignments.some(row => Number(row.id) === Number(assignment.body.assignment.id)));
    }
    await assert.rejects(require('../../services/assignmentService').listAssignments(), { status: 401 });
    const announcementData = { title: 'Owned course announcement', content: 'Security regression', audienceScope: 'course', courseId: course.id };
    assert.equal((await send('/api/announcements', other, 'POST', announcementData)).response.status, 403);
    assert.equal((await send('/api/announcements', teacher, 'POST', { ...announcementData, audienceScope: 'all' })).response.status, 403);
    const created = await send('/api/announcements', teacher, 'POST', announcementData);
    assert.equal(created.response.status, 201);
    announcementIds.push(created.body.announcement.id);
    const route = '/api/announcements/' + created.body.announcement.id;
    assert.equal((await send(route, other, 'DELETE')).response.status, 403);
    const listed = await send('/api/announcements', other);
    assert.equal(listed.response.status, 200);
    assert.ok(!listed.body.announcements.some(row => Number(row.id) === Number(created.body.announcement.id)));
    await db.run('UPDATE courses SET teacher_id = ? WHERE id = ?', [other.user.id, course.id]);
    const formerTeacherAnnouncements = await send('/api/announcements', teacher);
    assert.equal(formerTeacherAnnouncements.response.status, 200);
    assert.ok(!formerTeacherAnnouncements.body.announcements.some(row => Number(row.id) === Number(created.body.announcement.id)),
      'Former course owner must not retain announcement visibility through authorship');
    assert.equal((await send(route, teacher, 'DELETE')).response.status, 403);
    await db.run('UPDATE courses SET teacher_id = ? WHERE id = ?', [teacher.user.id, course.id]);
    assert.equal((await send(route, teacher, 'DELETE')).response.status, 200);
    assert.ok(await db.get(
      "SELECT id FROM system_audit_log WHERE entity_type = 'announcement' AND entity_id = ? AND action = 'delete'",
      [String(created.body.announcement.id)]
    ), 'Successful announcement deletion must record an audit');
  } finally {
    for (const id of announcementIds) {
      await db.run('DELETE FROM announcements WHERE id = ?', [id]);
    }
    for (const id of assignmentIds) {
      await db.run('DELETE FROM assignments WHERE id = ?', [id]);
    }
    await db.run('DELETE FROM courses WHERE id = ?', [course.id]);
  }
};
