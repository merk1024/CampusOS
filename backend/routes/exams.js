const express = require('express');

const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const db = require('../config/database');
const { logSystemAudit } = require('../utils/platformOps');
const { hasAdminAccess } = require('../utils/access');
const { canManageExam, teacherExamScope, validateExamCourse } = require('../utils/examAccess');

const validateExam = async (req, res, next) => {
  try {
    const data = req.body;
    if (typeof data.subject !== 'string' || !data.subject.trim()
      || typeof (data.group_name || data.groupName) !== 'string' || !(data.group_name || data.groupName).trim()
      || !/^\d{4}-\d{2}-\d{2}$/.test(data.exam_date || data.examDate || '')
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.exam_time || data.examTime || '')
      || !Array.isArray(data.students || []) || (data.students || []).length > 1000) {
      return res.status(400).json({ error: 'Subject, group, date, time and a student ID list are required' });
    }
    const date = data.exam_date || data.examDate;
    const parsed = new Date(date);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({ error: 'Invalid exam date' });
    }
    for (const studentId of data.students || []) {
      if (typeof studentId !== 'string' || !studentId.trim()) {
        return res.status(400).json({ error: 'Student IDs must be nonempty strings' });
      }
      const student = await db.get("SELECT id FROM users WHERE student_id = ? AND role = 'student'", [studentId]);
      if (!student) return res.status(400).json({ error: 'Unknown student ID' });
    }
    next();
  } catch (error) {
    console.error('Validate exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

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
    } else if (!hasAdminAccess(req.user)) {
      exams = await db.all(
        `SELECT e.* FROM exams e WHERE ${teacherExamScope()} ORDER BY e.exam_date DESC, e.exam_time DESC`,
        [req.user.id, req.user.id]
      );
    } else {
      exams = await db.all(
        'SELECT * FROM exams ORDER BY exam_date DESC, exam_time DESC'
      );
    }

    const examsWithStudents = await Promise.all(
      exams.map(async (exam) => {
        const students = await db.all(
          `SELECT es.student_id, u.name, u.email FROM exam_students es
           LEFT JOIN users u ON u.student_id = es.student_id
           WHERE es.exam_id = ? ORDER BY es.student_id`,
          [exam.id]
        );

        return {
          ...exam,
          ...(req.user.role !== 'student' ? { roster: students } : {}),
          students: students.map((student) => student.student_id)
            .filter((studentId) => req.user.role !== 'student' || studentId === req.user.student_id)
        };
      })
    );

    res.json({ exams: examsWithStudents });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, isTeacherOrAdmin, validateExam, async (req, res) => {
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

    const outcome = await db.transaction(async (tx) => {
    const access = await validateExamCourse(req.user, req.body, students, null, tx);
    if (access.error) return access;

    const result = await tx.run(
      `INSERT INTO exams (group_name, subject, exam_date, exam_time, room, teacher_name, type, semester, created_by, course_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        group_name || groupName,
        subject,
        exam_date || examDate,
        exam_time || examTime,
        room,
        req.user.name,
        type || 'Exam',
        semester || null,
        req.user.id,
        access.courseId
      ]
    );

    for (const studentId of students) {
      await tx.run(
        'INSERT INTO exam_students (exam_id, student_id) VALUES (?, ?) ON CONFLICT (exam_id, student_id) DO NOTHING',
        [result.id, studentId]
      );
    }

    const exam = await tx.get('SELECT * FROM exams WHERE id = ?', [result.id]);

    await logSystemAudit({
      entityType: 'exam',
      entityId: exam.id,
      action: 'create',
      summary: `${req.user.email} created exam "${exam.subject}" for ${exam.group_name}`,
      details: {
        type: exam.type,
        exam_date: exam.exam_date,
        exam_time: exam.exam_time,
        students: students.length
      },
      changedBy: req.user.id,
      requestId: req.requestId
    }, tx);
    return { exam };
    });
    if (outcome.error) return res.status(outcome.status).json({ error: outcome.error });
    const { exam } = outcome;

    res.status(201).json({
      message: 'Exam created successfully',
      exam: { ...exam, students }
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, isTeacherOrAdmin, validateExam, async (req, res) => {
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

    const outcome = await db.transaction(async (tx) => {
    const existingExam = await tx.get(
      'SELECT id, subject, group_name, type, exam_date, exam_time, course_id FROM exams WHERE id = ?'
        + (tx.client === 'postgres' ? ' FOR UPDATE' : ''),
      [req.params.id]
    );

    if (!existingExam) {
      return { status: 404, error: 'Exam not found' };
    }

    if (!await canManageExam(req.user, existingExam.id, tx)) {
      return { status: 403, error: 'Access denied' };
    }

    const access = await validateExamCourse(req.user, req.body, students, existingExam.course_id, tx);
    if (access.error) return access;

    await tx.run(
      `UPDATE exams
       SET group_name = ?, subject = ?, exam_date = ?, exam_time = ?, room = ?, type = ?, semester = ?, course_id = ?
       WHERE id = ?`,
      [
        group_name || groupName,
        subject,
        exam_date || examDate,
        exam_time || examTime,
        room,
        type || 'Exam',
        semester || null,
        access.courseId,
        req.params.id
      ]
    );

    await tx.run('DELETE FROM exam_students WHERE exam_id = ?', [req.params.id]);

    for (const studentId of students) {
      await tx.run(
        'INSERT INTO exam_students (exam_id, student_id) VALUES (?, ?) ON CONFLICT (exam_id, student_id) DO NOTHING',
        [req.params.id, studentId]
      );
    }

    const exam = await tx.get('SELECT * FROM exams WHERE id = ?', [req.params.id]);

    await logSystemAudit({
      entityType: 'exam',
      entityId: req.params.id,
      action: 'update',
      summary: `${req.user.email} updated exam "${exam.subject}"`,
      details: {
        previous: existingExam,
        current: {
          subject: exam.subject,
          group_name: exam.group_name,
          type: exam.type,
          exam_date: exam.exam_date,
          exam_time: exam.exam_time,
          students: students.length
        }
      },
      changedBy: req.user.id,
      requestId: req.requestId
    }, tx);
    return { exam };
    });
    if (outcome.error) return res.status(outcome.status).json({ error: outcome.error });
    const { exam } = outcome;

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
    const outcome = await db.transaction(async (tx) => {
    const existingExam = await tx.get(
      'SELECT id, subject, group_name, type, exam_date, exam_time FROM exams WHERE id = ?'
        + (tx.client === 'postgres' ? ' FOR UPDATE' : ''),
      [req.params.id]
    );

    if (!existingExam) {
      return { status: 404, error: 'Exam not found' };
    }

    if (!await canManageExam(req.user, existingExam.id, tx)) {
      return { status: 403, error: 'Access denied' };
    }

    await tx.run('DELETE FROM exam_students WHERE exam_id = ?', [req.params.id]);
    await tx.run('DELETE FROM exams WHERE id = ?', [req.params.id]);

    await logSystemAudit({
      entityType: 'exam',
      entityId: req.params.id,
      action: 'delete',
      summary: `${req.user.email} deleted exam "${existingExam.subject}"`,
      details: existingExam,
      changedBy: req.user.id,
      requestId: req.requestId
    }, tx);
    return {};
    });
    if (outcome.error) return res.status(outcome.status).json({ error: outcome.error });

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
