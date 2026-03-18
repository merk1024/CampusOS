const express = require('express');

const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const db = require('../config/database');

router.get('/', auth, async (req, res) => {
  try {
    let exams;

    if (req.user.role === 'student') {
      exams = await db.all(
        `SELECT e.*
         FROM exams e
         INNER JOIN exam_students es ON e.id = es.exam_id
         WHERE es.student_id = ?
         ORDER BY e.exam_date DESC, e.exam_time DESC`,
        [req.user.student_id]
      );
    } else {
      exams = await db.all(
        'SELECT * FROM exams ORDER BY exam_date DESC, exam_time DESC'
      );
    }

    const examsWithStudents = await Promise.all(
      exams.map(async (exam) => {
        const students = await db.all(
          'SELECT student_id FROM exam_students WHERE exam_id = ? ORDER BY student_id',
          [exam.id]
        );

        return {
          ...exam,
          students: students.map((student) => student.student_id)
        };
      })
    );

    res.json({ exams: examsWithStudents });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const {
      group_name,
      groupName,
      subject,
      exam_date,
      examDate,
      exam_time,
      examTime,
      room,
      type,
      semester,
      students = []
    } = req.body;

    const result = await db.run(
      `INSERT INTO exams (group_name, subject, exam_date, exam_time, room, teacher_name, type, semester, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        group_name || groupName,
        subject,
        exam_date || examDate,
        exam_time || examTime,
        room,
        req.user.name,
        type || 'Exam',
        semester || null,
        req.user.id
      ]
    );

    for (const studentId of students) {
      await db.run(
        'INSERT OR IGNORE INTO exam_students (exam_id, student_id) VALUES (?, ?)',
        [result.id, studentId]
      );
    }

    const exam = await db.get('SELECT * FROM exams WHERE id = ?', [result.id]);
    res.status(201).json({
      message: 'Exam created successfully',
      exam: { ...exam, students }
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const {
      group_name,
      groupName,
      subject,
      exam_date,
      examDate,
      exam_time,
      examTime,
      room,
      type,
      semester,
      students = []
    } = req.body;

    const result = await db.run(
      `UPDATE exams
       SET group_name = ?, subject = ?, exam_date = ?, exam_time = ?, room = ?, type = ?, semester = ?
       WHERE id = ?`,
      [
        group_name || groupName,
        subject,
        exam_date || examDate,
        exam_time || examTime,
        room,
        type || 'Exam',
        semester || null,
        req.params.id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    await db.run('DELETE FROM exam_students WHERE exam_id = ?', [req.params.id]);

    for (const studentId of students) {
      await db.run(
        'INSERT OR IGNORE INTO exam_students (exam_id, student_id) VALUES (?, ?)',
        [req.params.id, studentId]
      );
    }

    const exam = await db.get('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    res.json({
      message: 'Exam updated successfully',
      exam: { ...exam, students }
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM exam_students WHERE exam_id = ?', [req.params.id]);
    const result = await db.run('DELETE FROM exams WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
