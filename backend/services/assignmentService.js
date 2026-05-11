const db = require('../config/database');
const { hasAdminAccess } = require('../utils/access');
const { createServiceError } = require('./serviceError');

const ASSIGNMENT_SELECT = `
  SELECT
    a.*,
    u.name AS created_by_name,
    c.name AS course_name,
    c.code AS course_code,
    c.teacher_id AS course_teacher_id
  FROM assignments a
  LEFT JOIN users u ON u.id = a.created_by
  LEFT JOIN courses c ON c.id = a.course_id
`;

const normalizeCourseId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeMaxGrade = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
};

const loadCourseForAssignment = async (requester, courseId) => {
  if (!courseId) {
    if (requester?.role === 'teacher') {
      throw createServiceError(400, 'Select a course before publishing an assignment');
    }

    return null;
  }

  const course = await db.get(
    `SELECT id, code, name, teacher_id
     FROM courses
     WHERE id = ?`,
    [courseId]
  );

  if (!course) {
    throw createServiceError(404, 'Course not found');
  }

  if (!hasAdminAccess(requester) && course.teacher_id !== requester.id) {
    throw createServiceError(403, 'Access denied');
  }

  return course;
};

async function listAssignments() {
  const result = await db.query(
    `${ASSIGNMENT_SELECT}
     ORDER BY a.due_date DESC`
  );

  return result.rows;
}

async function createAssignment({ requester, data }) {
  const title = String(data?.title || '').trim();
  if (!title) {
    throw createServiceError(400, 'Assignment title is required');
  }

  const courseId = normalizeCourseId(data?.courseId ?? data?.course_id);
  const course = await loadCourseForAssignment(requester, courseId);
  const description = String(data?.description || '').trim();
  const dueDate = data?.dueDate || data?.due_date || null;
  const maxGrade = normalizeMaxGrade(data?.maxGrade ?? data?.max_grade);

  const result = await db.run(
    'INSERT INTO assignments (title, description, due_date, max_grade, course_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [title, description || null, dueDate, maxGrade, course?.id || null, requester.id]
  );

  const assignment = await db.get(
    `${ASSIGNMENT_SELECT}
     WHERE a.id = ?`,
    [result.id]
  );

  return {
    assignment,
    course
  };
}

module.exports = {
  createAssignment,
  listAssignments
};
