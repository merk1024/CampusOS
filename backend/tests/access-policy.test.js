const test = require('node:test');
const assert = require('node:assert/strict');
const { can } = require('../security/accessPolicy');

const teacher = { id: 2, role: 'teacher', name: 'Same display name' };
const student = { id: 3, role: 'student' };
const admin = { id: 4, role: 'admin' };

test('unknown actions and missing identities deny even privileged users', () => {
  assert.equal(can(admin, 'unknown', {}), false);
  assert.equal(can({ role: 'admin' }, 'exam.manage', {}), false);
  assert.equal(can(null, 'exam.manage', {}), false);
});

test('academic management requires a current course owner or administrator', () => {
  for (const action of ['course.manage', 'attendance.manage']) {
    assert.equal(can(teacher, action, { course_id: 9, teacher_id: '2' }), true);
    assert.equal(can(teacher, action, { course_id: 9, teacher_id: 8, teacher: teacher.name }), false);
    assert.equal(can(student, action, { course_id: 9, teacher_id: 3 }), false);
    assert.equal(can(admin, action, {}), true);
  }
});

test('legacy exams belong to their creator but linked exams follow reassignment', () => {
  assert.equal(can(teacher, 'exam.manage', { course_id: null, created_by: 2 }), true);
  assert.equal(can(teacher, 'exam.manage', { course_id: 9, created_by: 2, teacher_id: 8 }), false);
  assert.equal(can(teacher, 'exam.manage', { course_id: 9, created_by: 8, teacher_id: 2 }), true);
});

test('unlinked attendance and incomplete course context fail closed', () => {
  assert.equal(can(teacher, 'attendance.manage', { created_by: 2, teacher: teacher.name }), false);
  assert.equal(can(teacher, 'exam.manage', { course_id: 9, created_by: 2 }), false);
  assert.equal(can(teacher, 'course.manage', { course_id: 9, teacher_id: true }), false);
});

test('teachers publish only to owned courses while administrators broadcast', () => {
  assert.equal(can(teacher, 'announcement.publish', { audience_scope: 'all' }), false);
  assert.equal(can(teacher, 'announcement.publish', { audience_scope: 'course', course_id: 9, teacher_id: 2 }), true);
  assert.equal(can(admin, 'announcement.publish', { audience_scope: 'all' }), true);
});

test('announcement deletion requires authorship and current ownership', () => {
  assert.equal(can(teacher, 'announcement.delete', { created_by: 2, course_id: null }), true);
  assert.equal(can(teacher, 'announcement.delete', { created_by: 8, course_id: 9, teacher_id: 2 }), false);
  assert.equal(can(teacher, 'announcement.delete', { created_by: 2, course_id: 9, teacher_id: 8 }), false);
  assert.equal(can(admin, 'announcement.delete', { created_by: 8 }), true);
});

test('admin provisioning is reserved for the superadmin', () => {
  assert.equal(can(admin, 'admin.create', {}), false);
  assert.equal(can({ ...admin, is_superadmin: 1 }, 'admin.create', {}), true);
});
