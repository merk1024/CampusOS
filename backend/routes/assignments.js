const express = require('express');
const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const db = require('../config/database');

// Get assignments
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         a.*,
         u.name AS created_by_name,
         c.name AS course_name,
         c.code AS course_code
       FROM assignments a
       LEFT JOIN users u ON u.id = a.created_by
       LEFT JOIN courses c ON c.id = a.course_id
       ORDER BY a.due_date DESC`
    );
    res.json({ assignments: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create assignment
router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const { title, description, dueDate, maxGrade } = req.body;
    const result = await db.query(
      'INSERT INTO assignments (title, description, due_date, max_grade, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, dueDate, maxGrade || 100, req.user.id]
    );
    res.status(201).json({ assignment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
