const db = require('../config/database');
const { hasAdminAccess } = require('../utils/access');
const { createServiceError } = require('./serviceError');

const COURSE_SELECT = `
  SELECT
    c.*,
    u.name as teacher_name,
    u.email as teacher_email
  FROM courses c
  LEFT JOIN users u ON c.teacher_id = u.id
`;

const getActiveStudentFilter = () => (
  db.client === 'postgres'
    ? 'is_active = TRUE'
    : 'is_active = 1'
);

const normalizeTeacherId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeCourseIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
  )];
};

const normalizeStudentIdentifiers = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )];
  }

  if (typeof value !== 'string') {
    return [];
  }

  return [...new Set(
    value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
};

const getCourseWithTeacher = async (courseId) => (
  db.get(
    `${COURSE_SELECT}
     WHERE c.id = ?`,
    [courseId]
  )
);

const ensureAssignableTeacher = async (teacherId) => {
  if (!teacherId) {
    return null;
  }

  const teacher = await db.get(
    'SELECT id, role, name, email FROM users WHERE id = ?',
    [teacherId]
  );

  if (!teacher || teacher.role !== 'teacher') {
    throw createServiceError(400, 'Teacher not found');
  }

  return teacher;
};

const resolveCoursesByIds = async (courseIds) => {
  const rows = await Promise.all(
    courseIds.map((courseId) => db.get(
      `${COURSE_SELECT}
       WHERE c.id = ?`,
      [courseId]
    ))
  );

  const foundCourses = rows.filter(Boolean);
  const missingCourseIds = courseIds.filter((courseId) => !foundCourses.some((course) => course.id === courseId));

  return { foundCourses, missingCourseIds };
};

const resolveStudentsByIdentifiers = async (identifiers) => {
  const matchedById = new Map();
  const missingIdentifiers = [];

  for (const identifier of identifiers) {
    const student = await db.get(
      `SELECT id, student_id, email, name, group_name, subgroup_name
       FROM users
       WHERE role = 'student'
         AND ${getActiveStudentFilter()}
         AND (
           LOWER(email) = LOWER(?)
           OR student_id = ?
         )`,
      [identifier, identifier]
    );

    if (!student) {
      missingIdentifiers.push(identifier);
      continue;
    }

    matchedById.set(student.id, student);
  }

  return {
    students: [...matchedById.values()],
    missingIdentifiers
  };
};

const assertCourseAccess = (requester, course) => {
  if (!course) {
    throw createServiceError(404, 'Course not found');
  }

  if (!hasAdminAccess(requester) && course.teacher_id !== requester.id) {
    throw createServiceError(403, 'Access denied');
  }
};

async function listCourses() {
  return db.all(`
    ${COURSE_SELECT}
    ORDER BY c.created_at DESC
  `);
}

async function getCourseById(courseId) {
  const course = await getCourseWithTeacher(courseId);
  if (!course) {
    throw createServiceError(404, 'Course not found');
  }

  return course;
}

async function createCourse({ requester, data }) {
  const {
    code,
    name,
    description,
    credits,
    semester,
    teacher_id
  } = data || {};

  const existingCourse = await db.get('SELECT id FROM courses WHERE code = ?', [code]);
  if (existingCourse) {
    throw createServiceError(400, 'Course code already exists');
  }

  const assignedTeacherId = hasAdminAccess(requester)
    ? normalizeTeacherId(teacher_id)
    : requester.id;

  if (assignedTeacherId) {
    await ensureAssignableTeacher(assignedTeacherId);
  }

  const result = await db.run(
    'INSERT INTO courses (code, name, description, credits, semester, teacher_id) VALUES (?, ?, ?, ?, ?, ?)',
    [code, name, description, credits, semester, assignedTeacherId]
  );

  return getCourseWithTeacher(result.id);
}

async function updateCourse({ requester, courseId, data }) {
  const {
    code,
    name,
    description,
    credits,
    semester,
    teacher_id
  } = data || {};

  const course = await db.get('SELECT * FROM courses WHERE id = ?', [courseId]);
  assertCourseAccess(requester, course);

  let assignedTeacherId = course.teacher_id;
  if (hasAdminAccess(requester) && Object.prototype.hasOwnProperty.call(data || {}, 'teacher_id')) {
    assignedTeacherId = normalizeTeacherId(teacher_id);
    if (assignedTeacherId) {
      await ensureAssignableTeacher(assignedTeacherId);
    }
  }

  await db.run(
    'UPDATE courses SET code = ?, name = ?, description = ?, credits = ?, semester = ?, teacher_id = ? WHERE id = ?',
    [code, name, description, credits, semester, assignedTeacherId, courseId]
  );

  return getCourseWithTeacher(courseId);
}

async function assignTeacherToCourse({ requester, courseId, teacherId }) {
  if (!hasAdminAccess(requester)) {
    throw createServiceError(403, 'Access denied. Admin only.');
  }

  const course = await db.get('SELECT id FROM courses WHERE id = ?', [courseId]);
  if (!course) {
    throw createServiceError(404, 'Course not found');
  }

  const normalizedTeacherId = normalizeTeacherId(teacherId);
  if (normalizedTeacherId) {
    await ensureAssignableTeacher(normalizedTeacherId);
  }

  await db.run('UPDATE courses SET teacher_id = ? WHERE id = ?', [normalizedTeacherId, courseId]);

  return {
    teacherId: normalizedTeacherId,
    course: await getCourseWithTeacher(courseId)
  };
}

async function deleteCourse({ requester, courseId }) {
  const course = await db.get('SELECT * FROM courses WHERE id = ?', [courseId]);
  assertCourseAccess(requester, course);

  await db.run('DELETE FROM courses WHERE id = ?', [courseId]);
  return course;
}

async function listEnrolledCourses(studentUserId) {
  return db.all(`
    SELECT c.* FROM courses c
    JOIN course_enrollments e ON c.id = e.course_id
    WHERE e.student_id = ?
  `, [studentUserId]);
}

async function getCourseRoster({ requester, courseId }) {
  const course = await getCourseWithTeacher(courseId);
  assertCourseAccess(requester, course);

  const students = await db.all(`
    SELECT
      u.id,
      u.student_id,
      u.name,
      u.email,
      u.group_name,
      u.subgroup_name,
      u.faculty,
      u.major,
      e.enrolled_at
    FROM course_enrollments e
    JOIN users u ON e.student_id = u.id
    WHERE e.course_id = ?
    ORDER BY u.group_name ASC, u.name ASC
  `, [courseId]);

  return { course, students };
}

async function bulkAssignTeacherToCourses({ teacherId, courseIds }) {
  const normalizedCourseIds = normalizeCourseIds(courseIds);
  if (normalizedCourseIds.length === 0) {
    throw createServiceError(400, 'Select at least one course');
  }

  const normalizedTeacherId = normalizeTeacherId(teacherId);
  if (normalizedTeacherId) {
    await ensureAssignableTeacher(normalizedTeacherId);
  }

  const { foundCourses, missingCourseIds } = await resolveCoursesByIds(normalizedCourseIds);
  if (foundCourses.length === 0) {
    throw createServiceError(404, 'Selected courses were not found');
  }

  for (const course of foundCourses) {
    await db.run(
      'UPDATE courses SET teacher_id = ? WHERE id = ?',
      [normalizedTeacherId, course.id]
    );
  }

  const courses = await Promise.all(
    foundCourses.map((course) => getCourseWithTeacher(course.id))
  );

  return {
    teacherId: normalizedTeacherId,
    courses,
    missingCourseIds,
    requestedCourses: normalizedCourseIds.length
  };
}

async function bulkEnrollStudents({ courseIds, studentIdentifiers }) {
  const normalizedCourseIds = normalizeCourseIds(courseIds);
  const normalizedStudentIdentifiers = normalizeStudentIdentifiers(studentIdentifiers);

  if (normalizedCourseIds.length === 0) {
    throw createServiceError(400, 'Select at least one course');
  }

  if (normalizedStudentIdentifiers.length === 0) {
    throw createServiceError(400, 'Provide at least one student email or ID');
  }

  const { foundCourses, missingCourseIds } = await resolveCoursesByIds(normalizedCourseIds);
  const { students, missingIdentifiers } = await resolveStudentsByIdentifiers(normalizedStudentIdentifiers);

  if (foundCourses.length === 0) {
    throw createServiceError(404, 'Selected courses were not found');
  }

  if (students.length === 0) {
    throw createServiceError(404, 'No matching active students were found');
  }

  let created = 0;
  let skipped = 0;

  for (const course of foundCourses) {
    for (const student of students) {
      const existingEnrollment = await db.get(
        'SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?',
        [course.id, student.id]
      );

      if (existingEnrollment) {
        skipped += 1;
        continue;
      }

      await db.run(
        'INSERT INTO course_enrollments (course_id, student_id) VALUES (?, ?)',
        [course.id, student.id]
      );
      created += 1;
    }
  }

  return {
    courses: foundCourses,
    students,
    missingCourseIds,
    missingIdentifiers,
    requestedCourseCount: normalizedCourseIds.length,
    requestedStudentCount: normalizedStudentIdentifiers.length,
    created,
    skipped
  };
}

async function getCourseOperationsReport() {
  const rows = await db.all(`
    SELECT
      c.id,
      c.code,
      c.name,
      c.semester,
      c.credits,
      c.teacher_id,
      u.name AS teacher_name,
      u.email AS teacher_email,
      COUNT(e.id) AS enrollment_count,
      COUNT(DISTINCT student.group_name) AS group_count
    FROM courses c
    LEFT JOIN users u ON c.teacher_id = u.id
    LEFT JOIN course_enrollments e ON c.id = e.course_id
    LEFT JOIN users student ON e.student_id = student.id
    GROUP BY c.id, c.code, c.name, c.semester, c.credits, c.teacher_id, u.name, u.email
    ORDER BY c.created_at DESC, c.name ASC
  `);

  return rows.map((row) => ({
    ...row,
    enrollment_count: Number(row.enrollment_count || 0),
    group_count: Number(row.group_count || 0),
    teacher_name: row.teacher_name || 'Teacher not assigned',
    teacher_email: row.teacher_email || ''
  }));
}

async function enrollStudentInCourse({ courseId, studentUserId }) {
  const course = await db.get('SELECT id FROM courses WHERE id = ?', [courseId]);
  if (!course) {
    throw createServiceError(404, 'Course not found');
  }

  const existing = await db.get(
    'SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?',
    [courseId, studentUserId]
  );

  if (existing) {
    throw createServiceError(400, 'Already enrolled');
  }

  const result = await db.run(
    'INSERT INTO course_enrollments (course_id, student_id) VALUES (?, ?)',
    [courseId, studentUserId]
  );

  return { id: result.id };
}

async function unenrollStudentFromCourse({ courseId, studentUserId }) {
  const course = await db.get('SELECT id FROM courses WHERE id = ?', [courseId]);
  if (!course) {
    throw createServiceError(404, 'Course not found');
  }

  await db.run(
    'DELETE FROM course_enrollments WHERE course_id = ? AND student_id = ?',
    [courseId, studentUserId]
  );
}

module.exports = {
  bulkAssignTeacherToCourses,
  bulkEnrollStudents,
  createCourse,
  deleteCourse,
  enrollStudentInCourse,
  getCourseById,
  getCourseOperationsReport,
  getCourseRoster,
  listCourses,
  listEnrolledCourses,
  assignTeacherToCourse,
  unenrollStudentFromCourse,
  updateCourse
};
