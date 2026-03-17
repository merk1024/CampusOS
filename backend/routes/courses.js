const express = require('express');
const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const db = require('../config/database');

// Get all courses
router.get('/', auth, async (req, res) => {
  try {
    const courses = await db.all(`
      SELECT
        c.*,
        u.name as teacher_name,
        u.email as teacher_email
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      ORDER BY c.created_at DESC
    `);

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get course by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const course = await db.get(`
      SELECT
        c.*,
        u.name as teacher_name,
        u.email as teacher_email
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

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
    const { code, name, description, credits, semester } = req.body;

    // Check if course code already exists
    const existingCourse = await db.get('SELECT id FROM courses WHERE code = ?', [code]);
    if (existingCourse) {
      return res.status(400).json({ error: 'Course code already exists' });
    }

    await db.run(
      'INSERT INTO courses (code, name, description, credits, semester, teacher_id) VALUES (?, ?, ?, ?, ?, ?)',
      [code, name, description, credits, semester, req.user.id]
    );

    const course = await db.get('SELECT * FROM courses WHERE code = ?', [code]);

    res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update course (teacher/admin only)
router.put('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const { code, name, description, credits, semester } = req.body;

    // Check if course exists and user has permission
    const course = await db.get('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Only course teacher or admin can update
    if (req.user.role !== 'admin' && course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.run(
      'UPDATE courses SET code = ?, name = ?, description = ?, credits = ?, semester = ? WHERE id = ?',
      [code, name, description, credits, semester, req.params.id]
    );

    const updatedCourse = await db.get('SELECT * FROM courses WHERE id = ?', [req.params.id]);

    res.json({
      message: 'Course updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
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
    if (req.user.role !== 'admin' && course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.run('DELETE FROM courses WHERE id = ?', [req.params.id]);

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;