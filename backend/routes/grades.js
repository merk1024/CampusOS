const express = require('express');
const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const db = require('../config/database');
const { logGradeChange } = require('../utils/auditTrail');
const { logSystemAudit } = require('../utils/platformOps');
const { hasAdminAccess } = require('../utils/access');
const { canManageExam, teacherExamScope } = require('../utils/examAccess');

// @route   POST /api/grades
// @desc    Add or update grade
// @access  Private (Teacher/Admin)
router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const { examId, studentId, grade, comments } = req.body;

    if (!Number.isInteger(Number(examId)) || Number(examId) <= 0
      || typeof studentId !== 'string' || !studentId.trim()
      || !Number.isInteger(grade) || grade < 0 || grade > 100
      || (comments != null && (typeof comments !== 'string' || comments.length > 5000))) {
      return res.status(400).json({ error: 'Valid examId, studentId and an integer grade from 0 to 100 are required' });
    }
    const exam = await db.get('SELECT id FROM exams WHERE id = ?', [examId]);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (!await canManageExam(req.user, examId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const enrolled = await db.get(
      'SELECT id FROM exam_students WHERE exam_id = ? AND student_id = ?', [examId, studentId]
    );
    if (!enrolled) return res.status(400).json({ error: 'Student is not assigned to this exam' });

    // Check if grade exists
    const existing = await db.query(
      'SELECT id, grade, comments FROM grades WHERE exam_id = $1 AND student_id = $2',
      [examId, studentId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing grade
      result = await db.query(
        `UPDATE grades 
         SET grade = $1, comments = $2, graded_by = $3, graded_at = CURRENT_TIMESTAMP
         WHERE exam_id = $4 AND student_id = $5
         RETURNING *`,
        [grade, comments, req.user.id, examId, studentId]
      );
    } else {
      // Insert new grade
      result = await db.query(
        `INSERT INTO grades (exam_id, student_id, grade, comments, graded_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [examId, studentId, grade, comments, req.user.id]
      );
    }

    await logGradeChange({
      gradeId: result.rows[0]?.id,
      examId,
      studentId,
      previousGrade: existing.rows[0]?.grade,
      newGrade: result.rows[0]?.grade,
      previousComments: existing.rows[0]?.comments,
      newComments: result.rows[0]?.comments,
      changedBy: req.user.id
    });

    await logSystemAudit({
      entityType: 'grade',
      entityId: result.rows[0]?.id ?? `${examId}:${studentId}`,
      action: existing.rows.length > 0 ? 'update' : 'create',
      summary: `${req.user.email} ${existing.rows.length > 0 ? 'updated' : 'saved'} a grade for ${studentId}`,
      details: {
        examId,
        studentId,
        grade: result.rows[0]?.grade,
        comments: result.rows[0]?.comments || null
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({
      message: 'Grade saved successfully',
      grade: result.rows[0]
    });
  } catch (error) {
    console.error('Save grade error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/grades/audit
// @desc    Get grade audit trail
// @access  Private (Teacher/Admin)
router.get('/audit', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit || 50);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
      return res.status(400).json({ error: 'Valid limit is required' });
    }
    const limit = Math.min(requestedLimit, 200);
    const conditions = [];
    const params = [];

    if (!hasAdminAccess(req.user)) {
      conditions.push(teacherExamScope());
      params.push(req.user.id, req.user.id);
    }

    if (req.query.studentId) {
      conditions.push('gal.student_id = ?');
      params.push(String(req.query.studentId).trim());
    }

    if (req.query.examId) {
      const examId = Number(req.query.examId);
      if (!Number.isFinite(examId) || examId <= 0) {
        return res.status(400).json({ error: 'Valid examId is required' });
      }

      conditions.push('gal.exam_id = ?');
      params.push(examId);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const audit = await db.all(
      `SELECT
         gal.*,
         u.name AS changed_by_name,
         e.subject,
         e.type,
         e.group_name
       FROM grade_audit_log gal
       LEFT JOIN users u ON u.id = gal.changed_by
       LEFT JOIN exams e ON e.id = gal.exam_id
       ${whereClause}
       ORDER BY gal.changed_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    res.json({ audit });
  } catch (error) {
    console.error('Get grade audit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/grades/student/:studentId
// @desc    Get student grades
// @access  Private
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check permission
    if (req.user.role === 'student' && req.user.student_id !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT g.*, e.subject, e.exam_date, e.type, u.name as graded_by_name
       FROM grades g
       JOIN exams e ON g.exam_id = e.id
       LEFT JOIN users u ON g.graded_by = u.id
       WHERE g.student_id = ?
       ${!hasAdminAccess(req.user) && req.user.role === 'teacher' ? `AND ${teacherExamScope()}` : ''}
       ORDER BY e.exam_date DESC`,
      !hasAdminAccess(req.user) && req.user.role === 'teacher' ? [studentId, req.user.id, req.user.id] : [studentId]
    );

    res.json({ grades: result.rows });
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/grades/stats/:studentId
// @desc    Get student statistics
// @access  Private
router.get('/stats/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check permission
    if (req.user.role === 'student' && req.user.student_id !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_exams,
        AVG(grade) as average_grade,
        MAX(grade) as highest_grade,
        MIN(grade) as lowest_grade,
        COUNT(CASE WHEN grade >= 90 THEN 1 END) as excellent_count,
        COUNT(CASE WHEN grade >= 70 AND grade < 90 THEN 1 END) as good_count,
        COUNT(CASE WHEN grade >= 50 AND grade < 70 THEN 1 END) as satisfactory_count,
        COUNT(CASE WHEN grade < 50 THEN 1 END) as fail_count
       FROM grades g JOIN exams e ON e.id = g.exam_id
       WHERE g.student_id = ?
       ${!hasAdminAccess(req.user) && req.user.role === 'teacher' ? `AND ${teacherExamScope()}` : ''}`,
      !hasAdminAccess(req.user) && req.user.role === 'teacher' ? [studentId, req.user.id, req.user.id] : [studentId]
    );

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
