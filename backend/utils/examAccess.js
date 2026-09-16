const db = require('../config/database');
const { hasAdminAccess } = require('./access');

// Linked exams belong to the current course teacher. Legacy unlinked exams
// belong to their creator; matching display names never grants access.
const teacherExamScope = (alias = 'e') => `(
  (${alias}.course_id IS NULL AND ${alias}.created_by = ?)
  OR EXISTS (SELECT 1 FROM courses access_course
    WHERE access_course.id = ${alias}.course_id AND access_course.teacher_id = ?)
)`;

async function canManageExam(user, examId) {
  if (hasAdminAccess(user)) return true;
  if (user.role !== 'teacher') return false;
  return Boolean(await db.get(
    `SELECT e.id FROM exams e WHERE e.id = ? AND ${teacherExamScope()}`,
    [examId, user.id, user.id]
  ));
}

module.exports = { teacherExamScope, canManageExam };
