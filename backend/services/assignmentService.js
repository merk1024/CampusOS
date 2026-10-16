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
  if (value === undefined) return 100;
  const parsed = Number(value);
  if (!['number', 'string'].includes(typeof value) || !Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    throw createServiceError(400, 'Max grade must be an integer between 1 and 1000');
  }
  return parsed;
};

const normalizeDueDate = (value) => {
  const match = typeof value === 'string' && value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/
  );
  if (!match) {
    throw createServiceError(400, 'A valid ISO due date is required');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > daysInMonth || !Number.isFinite(Date.parse(value))) {
    throw createServiceError(400, 'A valid ISO due date is required');
  }
  return value;
};

const loadCourseForAssignment = async (requester, courseId, tx) => {
  if (!courseId) {
    if (requester?.role === 'teacher') {
      throw createServiceError(400, 'Select a course before publishing an assignment');
    }

    return null;
  }

  const course = await tx.get(
    `SELECT id, code, name, teacher_id
     FROM courses
     WHERE id = ?${tx.client === 'postgres' ? ' FOR UPDATE' : ''}`,
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

async function listAssignments(requester) {
  if (!requester?.id) {
    throw createServiceError(401, 'Authentication required');
  }

  let where = '';
  let params = [];
  if (!hasAdminAccess(requester)) {
    if (requester.role === 'teacher') {
      where = 'WHERE c.teacher_id = ? OR (a.course_id IS NULL AND a.created_by = ?)';
      params = [requester.id, requester.id];
    } else if (requester.role === 'student') {
      where = `WHERE EXISTS (
        SELECT 1 FROM course_enrollments ce
        WHERE ce.course_id = a.course_id AND ce.student_id = ?
      ) OR (a.course_id IS NULL AND (u.role = 'admin' OR u.is_superadmin = 1))`;
      params = [requester.id];
    } else {
      throw createServiceError(403, 'Access denied');
    }
  }
  const result = await db.query(
    `${ASSIGNMENT_SELECT}
     ${where}
     ORDER BY a.due_date DESC`,
    params
  );

  return result.rows;
}

async function createAssignment({ requester, data }) {
  const title = String(data?.title || '').trim();
  if (!title) {
    throw createServiceError(400, 'Assignment title is required');
  }

  const courseId = normalizeCourseId(data?.courseId ?? data?.course_id);
  const description = String(data?.description || '').trim();
  const dueDate = normalizeDueDate(data?.dueDate ?? data?.due_date);
  const maxGrade = normalizeMaxGrade(data?.maxGrade !== undefined ? data.maxGrade : data?.max_grade);

  return db.transaction(async (tx) => {
  const course = await loadCourseForAssignment(requester, courseId, tx);
  const result = await tx.run(
    'INSERT INTO assignments (title, description, due_date, max_grade, course_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [title, description || null, dueDate, maxGrade, course?.id || null, requester.id]
  );

  const assignment = await tx.get(
    `${ASSIGNMENT_SELECT}
     WHERE a.id = ?`,
    [result.id]
  );

  return {
    assignment,
    course
  };
  });
}

module.exports = {
  createAssignment,
  listAssignments
};
