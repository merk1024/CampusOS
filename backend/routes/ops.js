const express = require('express');

const router = express.Router();
const db = require('../config/database');
const { auth, isAdmin } = require('../middleware/auth');
const { runQueuedJobs } = require('../utils/platformOps');
const { canManageAcademicRecords, hasAdminAccess, isStudentAccount } = require('../utils/access');

const DEFAULT_RISK_WINDOW_DAYS = 45;

const normalizeDateInput = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftDateInput = (value, dayOffset) => {
  const normalized = normalizeDateInput(value);
  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);
  baseDate.setDate(baseDate.getDate() + dayOffset);
  return normalizeDateInput(baseDate);
};

const getDefaultRiskRange = () => {
  const to = normalizeDateInput(new Date());
  return {
    from: shiftDateInput(to, -(DEFAULT_RISK_WINDOW_DAYS - 1)),
    to
  };
};

const toRate = (value, total) => (
  total > 0 ? Math.round((Number(value) / Number(total)) * 100) : 0
);

const buildInClause = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return { clause: '(NULL)', params: [] };
  }

  return {
    clause: `(${values.map(() => '?').join(', ')})`,
    params: values
  };
};

const createStudentSnapshot = (profile, attendance, grades) => {
  const attendanceTotal = Number(attendance?.total_records || 0);
  const attendedCount = Number(attendance?.attended_records || 0);
  const absentCount = Number(attendance?.absent_count || 0);
  const lateCount = Number(attendance?.late_count || 0);
  const totalGrades = Number(grades?.total_grades || 0);
  const averageGrade = totalGrades > 0 ? Math.round(Number(grades?.average_grade || 0)) : null;
  const failCount = Number(grades?.fail_count || 0);
  const minGrade = totalGrades > 0 ? Number(grades?.min_grade || 0) : null;
  const attendanceRate = toRate(attendedCount, attendanceTotal);
  const reasons = [];

  if (attendanceTotal >= 3 && attendanceRate < 75) {
    reasons.push(`Attendance is below 75% (${attendanceRate}%)`);
  }

  if (absentCount >= 3) {
    reasons.push(`Multiple absences detected (${absentCount})`);
  }

  if (totalGrades >= 2 && averageGrade !== null && averageGrade < 70) {
    reasons.push(`Average grade is below 70 (${averageGrade})`);
  }

  if (failCount >= 1) {
    reasons.push(`Failing assessments detected (${failCount})`);
  }

  let severity = 'ok';
  if (
    (attendanceTotal >= 3 && attendanceRate < 60)
    || absentCount >= 4
    || (averageGrade !== null && averageGrade < 60)
    || failCount >= 2
    || (minGrade !== null && minGrade < 50)
  ) {
    severity = 'critical';
  } else if (reasons.length > 0) {
    severity = 'watch';
  }

  const riskScore = (
    Math.max(0, 80 - attendanceRate)
    + Math.max(0, 75 - (averageGrade ?? 75))
    + (absentCount * 10)
    + (lateCount * 4)
    + (failCount * 14)
  );

  return {
    studentId: profile.student_id,
    studentName: profile.name,
    groupName: profile.group_name || 'No group',
    subgroupName: profile.subgroup_name || null,
    attendanceRate,
    attendanceRecords: attendanceTotal,
    absentCount,
    lateCount,
    totalGrades,
    averageGrade,
    failCount,
    minGrade,
    lastAttendanceDate: attendance?.last_attendance_date || null,
    lastGradeDate: grades?.last_grade_date || null,
    severity,
    riskScore,
    reasons
  };
};

router.get('/audit', auth, isAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const entityType = String(req.query.entityType || '').trim();
    const params = [];
    let sql = `
      SELECT
        sal.*,
        u.name AS changed_by_name,
        u.email AS changed_by_email
      FROM system_audit_log sal
      LEFT JOIN users u ON sal.changed_by = u.id
    `;

    if (entityType) {
      sql += db.client === 'postgres'
        ? ' WHERE sal.entity_type = $1'
        : ' WHERE sal.entity_type = ?';
      params.push(entityType);
    }

    sql += db.client === 'postgres'
      ? ` ORDER BY sal.created_at DESC LIMIT $${params.length + 1}`
      : ' ORDER BY sal.created_at DESC LIMIT ?';
    params.push(limit);

    const audit = await db.all(sql, params);
    res.json({ audit });
  } catch (error) {
    console.error('Ops audit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/risk-flags', auth, async (req, res) => {
  try {
    const defaultRange = getDefaultRiskRange();
    const from = req.query.from ? normalizeDateInput(req.query.from) : defaultRange.from;
    const to = req.query.to ? normalizeDateInput(req.query.to) : defaultRange.to;
    const limit = Math.min(Math.max(Number(req.query.limit || 6), 1), 20);

    if (!from || !to) {
      return res.status(400).json({ error: 'Valid from and to dates are required' });
    }

    if (from > to) {
      return res.status(400).json({ error: 'The start date must be earlier than the end date' });
    }

    let profiles = [];
    if (hasAdminAccess(req.user)) {
      profiles = await db.all(
        `SELECT id, student_id, name, group_name, subgroup_name
         FROM users
         WHERE role = 'student'
         ORDER BY name`
      );
    } else if (canManageAcademicRecords(req.user)) {
      profiles = await db.all(
        `SELECT DISTINCT u.id, u.student_id, u.name, u.group_name, u.subgroup_name
         FROM users u
         JOIN course_enrollments ce ON ce.student_id = u.id
         JOIN courses c ON c.id = ce.course_id
         WHERE u.role = 'student'
           AND c.teacher_id = ?
         ORDER BY u.name`,
        [req.user.id]
      );
    } else if (isStudentAccount(req.user) && req.user.student_id) {
      profiles = await db.all(
        `SELECT id, student_id, name, group_name, subgroup_name
         FROM users
         WHERE role = 'student'
           AND student_id = ?`,
        [req.user.student_id]
      );
    }

    if (profiles.length === 0) {
      return res.json({
        from,
        to,
        summary: {
          studentsEvaluated: 0,
          flaggedStudents: 0,
          criticalFlags: 0,
          watchFlags: 0
        },
        flags: [],
        snapshot: null
      });
    }

    const studentIds = profiles
      .map((profile) => String(profile.student_id || '').trim())
      .filter(Boolean);

    const studentIdFilter = buildInClause(studentIds);
    const attendanceParams = [from, to];
    let attendanceSql = `
      SELECT
        a.student_id,
        COUNT(*) AS total_records,
        SUM(CASE WHEN a.status IN ('present', 'late', 'excused') THEN 1 ELSE 0 END) AS attended_records,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_count,
        MAX(a.date) AS last_attendance_date
      FROM attendance a
      LEFT JOIN schedule s ON s.id = a.schedule_id
      LEFT JOIN courses c ON c.id = s.course_id
      WHERE a.date >= ?
        AND a.date <= ?
        AND a.student_id IN ${studentIdFilter.clause}
    `;
    attendanceParams.push(...studentIdFilter.params);

    if (canManageAcademicRecords(req.user) && !hasAdminAccess(req.user)) {
      attendanceSql += `
        AND (
          c.teacher_id = ?
          OR COALESCE(s.teacher, '') = ?
          OR COALESCE(s.teacher, '') = ?
        )
      `;
      attendanceParams.push(req.user.id, req.user.name, req.user.email);
    }

    attendanceSql += ' GROUP BY a.student_id';

    const attendanceRows = await db.all(attendanceSql, attendanceParams);

    const gradeParams = [...studentIdFilter.params];
    let gradeSql = `
      SELECT
        g.student_id,
        COUNT(*) AS total_grades,
        AVG(g.grade) AS average_grade,
        MIN(g.grade) AS min_grade,
        SUM(CASE WHEN g.grade < 60 THEN 1 ELSE 0 END) AS fail_count,
        MAX(COALESCE(e.exam_date, DATE(g.graded_at))) AS last_grade_date
      FROM grades g
      LEFT JOIN exams e ON e.id = g.exam_id
      WHERE g.student_id IN ${studentIdFilter.clause}
    `;

    if (canManageAcademicRecords(req.user) && !hasAdminAccess(req.user)) {
      gradeSql += ' AND e.created_by = ?';
      gradeParams.push(req.user.id);
    }

    gradeSql += ' GROUP BY g.student_id';

    const gradeRows = await db.all(gradeSql, gradeParams);

    const attendanceByStudentId = new Map(
      attendanceRows.map((row) => [String(row.student_id), row])
    );
    const gradesByStudentId = new Map(
      gradeRows.map((row) => [String(row.student_id), row])
    );

    const snapshots = profiles
      .map((profile) => createStudentSnapshot(
        profile,
        attendanceByStudentId.get(String(profile.student_id)),
        gradesByStudentId.get(String(profile.student_id))
      ))
      .filter((snapshot) => (
        snapshot.attendanceRecords > 0 || snapshot.totalGrades > 0
      ));

    const flags = snapshots
      .filter((snapshot) => snapshot.severity !== 'ok')
      .sort((left, right) => {
        if (left.severity !== right.severity) {
          return left.severity === 'critical' ? -1 : 1;
        }
        return right.riskScore - left.riskScore;
      })
      .slice(0, limit);

    const summary = {
      studentsEvaluated: snapshots.length,
      flaggedStudents: snapshots.filter((snapshot) => snapshot.severity !== 'ok').length,
      criticalFlags: snapshots.filter((snapshot) => snapshot.severity === 'critical').length,
      watchFlags: snapshots.filter((snapshot) => snapshot.severity === 'watch').length
    };

    const studentSnapshot = isStudentAccount(req.user)
      ? (snapshots[0] || createStudentSnapshot(profiles[0], null, null))
      : null;

    res.json({
      from,
      to,
      summary,
      flags,
      snapshot: studentSnapshot
    });
  } catch (error) {
    console.error('Ops risk flags error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/jobs', auth, isAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const status = String(req.query.status || '').trim();
    const params = [];
    let sql = 'SELECT * FROM job_queue';

    if (status) {
      sql += db.client === 'postgres'
        ? ' WHERE status = $1'
        : ' WHERE status = ?';
      params.push(status);
    }

    sql += db.client === 'postgres'
      ? ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
      : ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const jobs = await db.all(sql, params);
    res.json({ jobs });
  } catch (error) {
    console.error('Ops jobs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/jobs/run', auth, isAdmin, async (req, res) => {
  try {
    const result = await runQueuedJobs({
      workerName: `manual-${req.user.id}`,
      limit: Math.min(Math.max(Number(req.body?.limit || 20), 1), 100)
    });

    res.json(result);
  } catch (error) {
    console.error('Run jobs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/notifications/me', auth, async (req, res) => {
  try {
    const notifications = await db.all(
      `SELECT *
       FROM notification_inbox
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Get notification inbox error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
