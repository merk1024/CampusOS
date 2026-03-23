const express = require('express');
const router = express.Router();
const { auth, isTeacherOrAdmin, isStudent } = require('../middleware/auth');
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

// Get course by ID
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
