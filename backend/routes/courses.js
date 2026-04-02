const express = require('express');
const router = express.Router();
const {
  auth,
  isAdmin,
  isTeacherOrAdmin,
  isStudent
} = require('../middleware/auth');
const db = require('../config/database');
const { hasAdminAccess } = require('../utils/access');

const COURSE_SELECT = `
  SELECT
    c.*,
    u.name as teacher_name,
    u.email as teacher_email
  FROM courses c
  LEFT JOIN users u ON c.teacher_id = u.id
`;

const getCourseWithTeacher = async (courseId) => (
  db.get(
    `${COURSE_SELECT}
     WHERE c.id = ?`,
    [courseId]
  )
);

const normalizeTeacherId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const ensureAssignableTeacher = async (teacherId) => {
  if (!teacherId) {
    return null;
  }

  const teacher = await db.get(
    'SELECT id, role, name, email FROM users WHERE id = ?',
    [teacherId]
  );

  if (!teacher || teacher.role !== 'teacher') {
    throw new Error('Teacher not found');
  }

  return teacher;
};

const getActiveStudentFilter = () => (
  db.client === 'postgres'
    ? 'is_active = TRUE'
    : 'is_active = 1'
);

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

const canAccessCourseRoster = (user, course) => (
  hasAdminAccess(user)
  || (user?.role === 'teacher' && course?.teacher_id === user.id)
);

// Get all courses
router.get('/', auth, async (req, res) => {
  try {
    const courses = await db.all(`
      ${COURSE_SELECT}
      ORDER BY c.created_at DESC
    `);

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/bulk/teacher-assignment', auth, isAdmin, async (req, res) => {
  try {
    const courseIds = normalizeCourseIds(req.body.course_ids);
    if (courseIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one course' });
    }

    const teacherId = normalizeTeacherId(req.body.teacher_id);
    if (teacherId) {
      await ensureAssignableTeacher(teacherId);
    }

    const { foundCourses, missingCourseIds } = await resolveCoursesByIds(courseIds);
    if (foundCourses.length === 0) {
      return res.status(404).json({ error: 'Selected courses were not found' });
    }

    for (const course of foundCourses) {
      await db.run(
        'UPDATE courses SET teacher_id = ? WHERE id = ?',
        [teacherId, course.id]
      );
    }

    const refreshedCourses = await Promise.all(
      foundCourses.map((course) => getCourseWithTeacher(course.id))
    );

    res.json({
      message: teacherId
        ? 'Teacher assignment updated for selected courses'
        : 'Teacher removed from selected courses',
      summary: {
        requested_courses: courseIds.length,
        updated_courses: refreshedCourses.length,
        missing_courses: missingCourseIds.length
      },
      missing_course_ids: missingCourseIds,
      courses: refreshedCourses
    });
  } catch (error) {
    console.error('Bulk teacher assignment error:', error);
    if (error.message === 'Teacher not found') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/bulk/enrollments', auth, isAdmin, async (req, res) => {
  try {
    const courseIds = normalizeCourseIds(req.body.course_ids);
    const studentIdentifiers = normalizeStudentIdentifiers(req.body.student_identifiers);

    if (courseIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one course' });
    }

    if (studentIdentifiers.length === 0) {
      return res.status(400).json({ error: 'Provide at least one student email or ID' });
    }

    const { foundCourses, missingCourseIds } = await resolveCoursesByIds(courseIds);
    const { students, missingIdentifiers } = await resolveStudentsByIdentifiers(studentIdentifiers);

    if (foundCourses.length === 0) {
      return res.status(404).json({ error: 'Selected courses were not found' });
    }

    if (students.length === 0) {
      return res.status(404).json({ error: 'No matching active students were found' });
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

    res.json({
      message: 'Bulk enrollment processed',
      summary: {
        requested_courses: courseIds.length,
        matched_courses: foundCourses.length,
        requested_students: studentIdentifiers.length,
        matched_students: students.length,
        requested_pairs: foundCourses.length * students.length,
        created,
        skipped,
        missing_courses: missingCourseIds.length,
        missing_students: missingIdentifiers.length
      },
      missing_course_ids: missingCourseIds,
      missing_students: missingIdentifiers,
      courses: foundCourses.map((course) => ({
        id: course.id,
        code: course.code,
        name: course.name
      })),
      students: students.map((student) => ({
        id: student.id,
        student_id: student.student_id,
        email: student.email,
        name: student.name
      }))
    });
  } catch (error) {
    console.error('Bulk course enrollment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reports/overview', auth, isAdmin, async (req, res) => {
  try {
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

    const normalizedRows = rows.map((row) => ({
      ...row,
      enrollment_count: Number(row.enrollment_count || 0),
      group_count: Number(row.group_count || 0),
      teacher_name: row.teacher_name || 'Teacher not assigned',
      teacher_email: row.teacher_email || ''
    }));

    res.json({
      generated_at: new Date().toISOString(),
      summary: {
        total_courses: normalizedRows.length,
        assigned_courses: normalizedRows.filter((row) => row.teacher_id).length,
        unassigned_courses: normalizedRows.filter((row) => !row.teacher_id).length,
        total_enrollments: normalizedRows.reduce((sum, row) => sum + row.enrollment_count, 0)
      },
      rows: normalizedRows
    });
  } catch (error) {
    console.error('Course operations report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get student-enrolled course list
router.get('/enrolled', auth, isStudent, async (req, res) => {
  try {
    const result = await db.all(`
      SELECT c.* FROM courses c
      JOIN course_enrollments e ON c.id = e.course_id
      WHERE e.student_id = ?
    `, [req.user.id]);

    res.json({ courses: result });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/roster', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const course = await getCourseWithTeacher(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!canAccessCourseRoster(req.user, course)) {
      return res.status(403).json({ error: 'Access denied' });
    }

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
    `, [req.params.id]);

    res.json({
      course,
      students
    });
  } catch (error) {
    console.error('Get course roster error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get course by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const course = await getCourseWithTeacher(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create course (teacher/admin only)
router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const { code, name, description, credits, semester, teacher_id } = req.body;

    // Check if course code already exists
    const existingCourse = await db.get('SELECT id FROM courses WHERE code = ?', [code]);
    if (existingCourse) {
      return res.status(400).json({ error: 'Course code already exists' });
    }

    const assignedTeacherId = hasAdminAccess(req.user)
      ? normalizeTeacherId(teacher_id)
      : req.user.id;

    if (assignedTeacherId) {
      await ensureAssignableTeacher(assignedTeacherId);
    }

    const result = await db.run(
      'INSERT INTO courses (code, name, description, credits, semester, teacher_id) VALUES (?, ?, ?, ?, ?, ?)',
      [code, name, description, credits, semester, assignedTeacherId]
    );

    const course = await getCourseWithTeacher(result.id);

    res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    if (error.message === 'Teacher not found') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update course (teacher/admin only)
router.put('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const { code, name, description, credits, semester, teacher_id } = req.body;

    // Check if course exists and user has permission
    const course = await db.get('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Only course teacher or admin can update
    if (!hasAdminAccess(req.user) && course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let assignedTeacherId = course.teacher_id;
    if (hasAdminAccess(req.user) && Object.prototype.hasOwnProperty.call(req.body, 'teacher_id')) {
      assignedTeacherId = normalizeTeacherId(teacher_id);
      if (assignedTeacherId) {
        await ensureAssignableTeacher(assignedTeacherId);
      }
    }

    await db.run(
      'UPDATE courses SET code = ?, name = ?, description = ?, credits = ?, semester = ?, teacher_id = ? WHERE id = ?',
      [code, name, description, credits, semester, assignedTeacherId, req.params.id]
    );

    const updatedCourse = await getCourseWithTeacher(req.params.id);

    res.json({
      message: 'Course updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
    if (error.message === 'Teacher not found') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/teacher', auth, async (req, res) => {
  try {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const course = await db.get('SELECT id FROM courses WHERE id = ?', [req.params.id]);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const teacherId = normalizeTeacherId(req.body.teacher_id);
    if (teacherId) {
      await ensureAssignableTeacher(teacherId);
    }

    await db.run('UPDATE courses SET teacher_id = ? WHERE id = ?', [teacherId, req.params.id]);
    const updatedCourse = await getCourseWithTeacher(req.params.id);

    res.json({
      message: teacherId ? 'Teacher assigned successfully' : 'Teacher removed successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Assign course teacher error:', error);
    if (error.message === 'Teacher not found') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete course (admin only)
router.delete('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const course = await db.get('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Only course teacher or admin can delete
    if (!hasAdminAccess(req.user) && course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.run('DELETE FROM courses WHERE id = ?', [req.params.id]);

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Enroll in course
router.post('/:id/enroll', auth, isStudent, async (req, res) => {
  try {
    const course = await db.get('SELECT id FROM courses WHERE id = ?', [req.params.id]);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already enrolled
    const existing = await db.get(
      'SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing) {
      return res.status(400).json({ error: 'Already enrolled' });
    }

    const result = await db.run(
      'INSERT INTO course_enrollments (course_id, student_id) VALUES (?, ?)',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Enrolled successfully', enrollment: { id: result.id } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Unenroll from course
router.delete('/:id/enroll', auth, isStudent, async (req, res) => {
  try {
    const course = await db.get('SELECT id FROM courses WHERE id = ?', [req.params.id]);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await db.run(
      'DELETE FROM course_enrollments WHERE course_id = ? AND student_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Unenrolled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
