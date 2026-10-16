const db = require('../config/database');
const { hasAdminAccess } = require('./access');

// Linked exams belong to the current course teacher. Legacy unlinked exams
// belong to their creator; matching display names never grants access.
const teacherExamScope = (alias = 'e') => `(
  (${alias}.course_id IS NULL AND ${alias}.created_by = ?)
  OR EXISTS (SELECT 1 FROM courses access_course
    WHERE access_course.id = ${alias}.course_id AND access_course.teacher_id = ?)
)`;

async function canManageExam(user, examId, executor = db) {
  if (executor !== db) {
    const lock = executor.client === 'postgres' ? ' FOR UPDATE' : '';
    const exam = await executor.get('SELECT id, course_id, created_by FROM exams WHERE id = ?' + lock, [examId]);
    if (!exam) return false;
    const course = exam.course_id === null ? null : await executor.get(
      'SELECT id, teacher_id FROM courses WHERE id = ?' + lock, [exam.course_id]
    );
    return hasAdminAccess(user) || (user.role === 'teacher' && (exam.course_id === null
      ? Number(exam.created_by) === Number(user.id)
      : Boolean(course) && Number(course.teacher_id) === Number(user.id)));
  }
  if (hasAdminAccess(user)) return true;
  if (user.role !== 'teacher') return false;
  return Boolean(await executor.get(
    `SELECT e.id FROM exams e WHERE e.id = ? AND ${teacherExamScope()}`,
    [examId, user.id, user.id]
  ));
}

async function validateExamCourse(user, body, students, existingCourseId = null, executor = db) {
  const hasSnake = Object.prototype.hasOwnProperty.call(body, 'course_id');
  const hasCamel = Object.prototype.hasOwnProperty.call(body, 'courseId');
  if (hasSnake && hasCamel && String(body.course_id) !== String(body.courseId)) {
    return { status: 400, error: 'Conflicting course IDs' };
  }
  const value = hasSnake ? body.course_id : hasCamel ? body.courseId : existingCourseId;
  const courseId = value === null || value === undefined || value === '' ? null : Number(value);
  if (courseId !== null && (!['string', 'number'].includes(typeof value)
    || !Number.isSafeInteger(courseId) || courseId <= 0)) {
    return { status: 400, error: 'Invalid course ID' };
  }
  const admin = hasAdminAccess(user);
  if (courseId === null) {
    return admin ? { courseId } : { status: 403, error: 'An owned course is required' };
  }
  const lock = executor !== db && executor.client === 'postgres' ? ' FOR UPDATE' : '';
  const course = await executor.get('SELECT id, teacher_id FROM courses WHERE id = ?' + lock, [courseId]);
  if (!course || (!admin && Number(course.teacher_id) !== Number(user.id))) {
    return { status: 403, error: 'Course access denied' };
  }
  if (!admin) {
    for (const studentId of students) {
      const enrolled = await executor.get(
        `SELECT u.id FROM users u JOIN course_enrollments ce ON ce.student_id = u.id
         WHERE ce.course_id = ? AND u.student_id = ? AND u.role = 'student'${lock}`,
        [courseId, studentId]
      );
      if (!enrolled) return { status: 403, error: 'Student is not enrolled in this course' };
    }
  }
  return { courseId };
}

module.exports = { teacherExamScope, canManageExam, validateExamCourse };
