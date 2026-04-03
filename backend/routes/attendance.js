const express = require('express');

const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const { hasAdminAccess } = require('../utils/access');
const db = require('../config/database');
const { logAttendanceChange } = require('../utils/auditTrail');
const { logSystemAudit } = require('../utils/platformOps');

const VALID_STATUSES = new Set(['present', 'absent', 'late', 'excused']);
const ATTENDED_STATUSES = new Set(['present', 'late', 'excused']);
const DEFAULT_ANALYTICS_WINDOW_DAYS = 30;
const DAY_ORDER_SQL = `
  CASE s.day
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
    WHEN 'Sunday' THEN 7
    ELSE 99
  END
`;

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

const normalizeStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_STATUSES.has(normalized) ? normalized : null;
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

const getDefaultAnalyticsRange = () => {
  const to = normalizeDateInput(new Date());
  return {
    from: shiftDateInput(to, -(DEFAULT_ANALYTICS_WINDOW_DAYS - 1)),
    to
  };
};

const toRate = (attended, total) => (
  total > 0 ? Math.round((attended / total) * 100) : 0
);

const toDateKey = (value) => {
  const normalized = normalizeDateInput(value);
  return normalized || String(value || '');
};

const getScheduleRecord = async (scheduleId) => (
  db.get(
    `SELECT
       s.*,
       c.code AS course_code,
       c.name AS course_name,
       c.teacher_id,
       u.name AS assigned_teacher_name,
       u.email AS assigned_teacher_email
     FROM schedule s
     LEFT JOIN courses c ON c.id = s.course_id
     LEFT JOIN users u ON u.id = c.teacher_id
     WHERE s.id = ?`,
    [scheduleId]
  )
);

const getAccessError = (schedule, user) => {
  if (!schedule) {
    return { status: 404, error: 'Schedule not found' };
  }

  if (hasAdminAccess(user)) {
    return null;
  }

  const scheduleTeachers = [
    schedule.teacher,
    schedule.assigned_teacher_name,
    schedule.assigned_teacher_email
  ].filter(Boolean);

  const matchesTeacher = Number(schedule.teacher_id) === Number(user.id)
    || scheduleTeachers.includes(user.name)
    || scheduleTeachers.includes(user.email);

  if (user.role === 'teacher' && matchesTeacher) {
    return null;
  }

  return { status: 403, error: 'Access denied' };
};

const getRosterForSchedule = async (schedule, date) => {
  const audienceType = String(schedule.audience_type || 'group').toLowerCase();
  const baseSelect = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.student_id,
      u.group_name,
      u.subgroup_name,
      a.status AS attendance_status,
      a.marked_at
    FROM users u
  `;

  let sql = baseSelect;
  const params = [];

  if (audienceType === 'individual' && schedule.student_user_id) {
    sql += `
      LEFT JOIN attendance a
        ON a.schedule_id = ?
       AND a.date = ?
       AND a.student_id = u.student_id
      WHERE u.role = 'student'
        AND u.id = ?
    `;
    params.push(schedule.id, date, schedule.student_user_id);
  } else if (schedule.course_id) {
    sql += `
      JOIN course_enrollments ce
        ON ce.student_id = u.id
       AND ce.course_id = ?
      LEFT JOIN attendance a
        ON a.schedule_id = ?
       AND a.date = ?
       AND a.student_id = u.student_id
      WHERE u.role = 'student'
    `;
    params.push(schedule.course_id, schedule.id, date);

    if (schedule.group_name) {
      sql += ' AND COALESCE(u.group_name, \'\') = COALESCE(?, \'\')';
      params.push(schedule.group_name);
    }

    if (audienceType === 'subgroup') {
      sql += ' AND COALESCE(u.subgroup_name, \'\') = COALESCE(?, \'\')';
      params.push(schedule.subgroup_name || '');
    }
  } else {
    sql += `
      LEFT JOIN attendance a
        ON a.schedule_id = ?
       AND a.date = ?
       AND a.student_id = u.student_id
      WHERE u.role = 'student'
    `;
    params.push(schedule.id, date);

    if (schedule.group_name) {
      sql += ' AND COALESCE(u.group_name, \'\') = COALESCE(?, \'\')';
      params.push(schedule.group_name);
    }

    if (audienceType === 'subgroup') {
      sql += ' AND COALESCE(u.subgroup_name, \'\') = COALESCE(?, \'\')';
      params.push(schedule.subgroup_name || '');
    }
  }

  sql += `
    ORDER BY
      COALESCE(u.group_name, ''),
      COALESCE(u.subgroup_name, ''),
      u.name
  `;

  const roster = await db.all(sql, params);

  return roster.map((student) => ({
    ...student,
    status: student.attendance_status || null
  }));
};

const buildSummary = (students) => {
  const summary = {
    total: students.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    marked: 0,
    unmarked: 0
  };

  students.forEach((student) => {
    const status = normalizeStatus(student.status);
    if (!status) {
      summary.unmarked += 1;
      return;
    }

    summary.marked += 1;
    summary[status] += 1;
  });

  return summary;
};

const buildAttendanceAnalytics = (records) => {
  const summary = {
    totalRecords: records.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendanceRate: 0,
    studentsTracked: 0,
    coursesTracked: 0,
    groupsTracked: 0,
    atRiskStudents: 0
  };

  const trendByDate = new Map();
  const courseBreakdown = new Map();
  const groupBreakdown = new Map();
  const studentRisk = new Map();
  const trackedStudents = new Set();
  const trackedCourses = new Set();
  const trackedGroups = new Set();

  records.forEach((record) => {
    const status = normalizeStatus(record.status);
    if (!status) {
      return;
    }

    const dateKey = toDateKey(record.date);
    const attended = ATTENDED_STATUSES.has(status);
    const courseLabel = record.course_name || record.course_code || record.subject || 'Unassigned course';
    const groupName = record.student_group_name || record.schedule_group_name || 'No group';
    const courseKey = String(record.course_id || `${courseLabel}:${groupName}`);
    const groupKey = String(groupName);
    const studentKey = String(record.student_user_id || record.student_id || record.student_name || 'unknown');

    summary[status] += 1;

    if (record.student_id) {
      trackedStudents.add(String(record.student_id));
    }

    trackedCourses.add(courseKey);
    trackedGroups.add(groupKey);

    const trendEntry = trendByDate.get(dateKey) || {
      date: dateKey,
      totalRecords: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attended: 0
    };
    trendEntry.totalRecords += 1;
    trendEntry[status] += 1;
    if (attended) {
      trendEntry.attended += 1;
    }
    trendByDate.set(dateKey, trendEntry);

    const courseEntry = courseBreakdown.get(courseKey) || {
      courseId: record.course_id || null,
      courseCode: record.course_code || null,
      courseName: record.course_name || null,
      subject: record.subject || null,
      groupName,
      totalRecords: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attended: 0,
      studentsTracked: new Set()
    };
    courseEntry.totalRecords += 1;
    courseEntry[status] += 1;
    if (attended) {
      courseEntry.attended += 1;
    }
    if (record.student_id) {
      courseEntry.studentsTracked.add(String(record.student_id));
    }
    courseBreakdown.set(courseKey, courseEntry);

    const groupEntry = groupBreakdown.get(groupKey) || {
      groupName,
      totalRecords: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attended: 0,
      studentsTracked: new Set()
    };
    groupEntry.totalRecords += 1;
    groupEntry[status] += 1;
    if (attended) {
      groupEntry.attended += 1;
    }
    if (record.student_id) {
      groupEntry.studentsTracked.add(String(record.student_id));
    }
    groupBreakdown.set(groupKey, groupEntry);

    const studentEntry = studentRisk.get(studentKey) || {
      studentId: record.student_id || null,
      studentName: record.student_name || record.student_id || 'Unknown student',
      groupName,
      totalRecords: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attended: 0,
      courseLabels: new Set()
    };
    studentEntry.totalRecords += 1;
    studentEntry[status] += 1;
    if (attended) {
      studentEntry.attended += 1;
    }
    studentEntry.courseLabels.add(courseLabel);
    studentRisk.set(studentKey, studentEntry);
  });

  const attendedCount = summary.present + summary.late + summary.excused;
  summary.attendanceRate = toRate(attendedCount, summary.totalRecords);
  summary.studentsTracked = trackedStudents.size;
  summary.coursesTracked = trackedCourses.size;
  summary.groupsTracked = trackedGroups.size;

  const trend = Array.from(trendByDate.values())
    .sort((left, right) => String(left.date).localeCompare(String(right.date)))
    .map((entry) => ({
      ...entry,
      attendanceRate: toRate(entry.attended, entry.totalRecords)
    }));

  const normalizedCourseBreakdown = Array.from(courseBreakdown.values())
    .map((entry) => ({
      courseId: entry.courseId,
      courseCode: entry.courseCode,
      courseName: entry.courseName,
      subject: entry.subject,
      groupName: entry.groupName,
      totalRecords: entry.totalRecords,
      present: entry.present,
      absent: entry.absent,
      late: entry.late,
      excused: entry.excused,
      attendanceRate: toRate(entry.attended, entry.totalRecords),
      studentsTracked: entry.studentsTracked.size
    }))
    .sort((left, right) => {
      if (left.attendanceRate !== right.attendanceRate) {
        return left.attendanceRate - right.attendanceRate;
      }
      return right.totalRecords - left.totalRecords;
    });

  const normalizedGroupBreakdown = Array.from(groupBreakdown.values())
    .map((entry) => ({
      groupName: entry.groupName,
      totalRecords: entry.totalRecords,
      present: entry.present,
      absent: entry.absent,
      late: entry.late,
      excused: entry.excused,
      attendanceRate: toRate(entry.attended, entry.totalRecords),
      studentsTracked: entry.studentsTracked.size
    }))
    .sort((left, right) => {
      if (left.attendanceRate !== right.attendanceRate) {
        return left.attendanceRate - right.attendanceRate;
      }
      return right.totalRecords - left.totalRecords;
    });

  const riskStudents = Array.from(studentRisk.values())
    .map((entry) => {
      const attendanceRate = toRate(entry.attended, entry.totalRecords);
      const riskScore = (entry.absent * 3) + (entry.late * 2) + Math.max(0, 80 - attendanceRate);
      return {
        studentId: entry.studentId,
        studentName: entry.studentName,
        groupName: entry.groupName,
        totalRecords: entry.totalRecords,
        present: entry.present,
        absent: entry.absent,
        late: entry.late,
        excused: entry.excused,
        attendanceRate,
        riskScore,
        courseLabels: Array.from(entry.courseLabels).slice(0, 3)
      };
    })
    .filter((entry) => (
      entry.totalRecords >= 3
      && (entry.attendanceRate < 75 || entry.absent >= 2 || (entry.absent + entry.late) >= 3)
    ))
    .sort((left, right) => {
      if (left.riskScore !== right.riskScore) {
        return right.riskScore - left.riskScore;
      }
      return left.attendanceRate - right.attendanceRate;
    })
    .slice(0, 8);

  summary.atRiskStudents = riskStudents.length;

  return {
    summary,
    trend,
    courseBreakdown: normalizedCourseBreakdown.slice(0, 8),
    groupBreakdown: normalizedGroupBreakdown.slice(0, 8),
    riskStudents
  };
};

const upsertAttendance = async ({ scheduleId, studentId, date, status, markedBy }) => (
  db.run(
    `INSERT INTO attendance (schedule_id, student_id, date, status, marked_by)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (schedule_id, student_id, date)
     DO UPDATE SET
       status = excluded.status,
       marked_by = excluded.marked_by,
       marked_at = CURRENT_TIMESTAMP`,
    [scheduleId, studentId, date, status, markedBy]
  )
);

router.get('/management/sessions', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const date = normalizeDateInput(req.query.date);
    if (!date) {
      return res.status(400).json({ error: 'Valid date is required' });
    }

    let sql = `
      SELECT
        s.*,
        c.code AS course_code,
        c.name AS course_name,
        c.teacher_id,
        u.name AS assigned_teacher_name,
        (
          SELECT COUNT(*)
          FROM attendance a
          WHERE a.schedule_id = s.id
            AND a.date = ?
        ) AS marked_count
      FROM schedule s
      LEFT JOIN courses c ON c.id = s.course_id
      LEFT JOIN users u ON u.id = c.teacher_id
    `;
    const params = [date];

    if (!hasAdminAccess(req.user)) {
      sql += `
        WHERE
          c.teacher_id = ?
          OR COALESCE(s.teacher, '') = ?
          OR COALESCE(s.teacher, '') = ?
      `;
      params.push(req.user.id, req.user.name, req.user.email);
    }

    sql += `
      ORDER BY
        ${DAY_ORDER_SQL},
        s.time_slot,
        COALESCE(s.group_name, ''),
        COALESCE(s.subgroup_name, '')
    `;

    const sessions = await db.all(sql, params);
    res.json({ date, sessions });
  } catch (error) {
    console.error('Get attendance sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/management/session/:scheduleId', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const scheduleId = Number(req.params.scheduleId);
    const date = normalizeDateInput(req.query.date);

    if (!scheduleId || !date) {
      return res.status(400).json({ error: 'Valid schedule and date are required' });
    }

    const session = await getScheduleRecord(scheduleId);
    const accessError = getAccessError(session, req.user);
    if (accessError) {
      return res.status(accessError.status).json({ error: accessError.error });
    }

    const students = await getRosterForSchedule(session, date);
    res.json({
      date,
      session,
      students,
      summary: buildSummary(students)
    });
  } catch (error) {
    console.error('Get attendance session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/analytics', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const defaultRange = getDefaultAnalyticsRange();
    const from = req.query.from ? normalizeDateInput(req.query.from) : defaultRange.from;
    const to = req.query.to ? normalizeDateInput(req.query.to) : defaultRange.to;

    if (!from || !to) {
      return res.status(400).json({ error: 'Valid from and to dates are required' });
    }

    if (from > to) {
      return res.status(400).json({ error: 'The start date must be earlier than the end date' });
    }

    let sql = `
      SELECT
        a.id,
        a.schedule_id,
        a.student_id,
        a.date,
        a.status,
        s.subject,
        s.day,
        s.time_slot,
        s.group_name AS schedule_group_name,
        s.subgroup_name AS schedule_subgroup_name,
        s.room,
        s.teacher,
        s.course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.teacher_id,
        u.id AS student_user_id,
        u.name AS student_name,
        u.group_name AS student_group_name,
        u.subgroup_name AS student_subgroup_name
      FROM attendance a
      LEFT JOIN schedule s ON s.id = a.schedule_id
      LEFT JOIN courses c ON c.id = s.course_id
      LEFT JOIN users u ON u.student_id = a.student_id
      WHERE a.date >= ?
        AND a.date <= ?
    `;
    const params = [from, to];

    if (!hasAdminAccess(req.user)) {
      sql += `
        AND (
          c.teacher_id = ?
          OR COALESCE(s.teacher, '') = ?
          OR COALESCE(s.teacher, '') = ?
        )
      `;
      params.push(req.user.id, req.user.name, req.user.email);
    }

    sql += `
      ORDER BY
        a.date ASC,
        ${DAY_ORDER_SQL},
        s.time_slot,
        a.student_id
    `;

    const records = await db.all(sql, params);

    res.json({
      from,
      to,
      ...buildAttendanceAnalytics(records)
    });
  } catch (error) {
    console.error('Get attendance analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/bulk', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const scheduleId = Number(req.body.scheduleId);
    const date = normalizeDateInput(req.body.date);
    const records = Array.isArray(req.body.records) ? req.body.records : [];

    if (!scheduleId || !date) {
      return res.status(400).json({ error: 'Valid schedule and date are required' });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'Attendance records are required' });
    }

    const session = await getScheduleRecord(scheduleId);
    const accessError = getAccessError(session, req.user);
    if (accessError) {
      return res.status(accessError.status).json({ error: accessError.error });
    }

    const roster = await getRosterForSchedule(session, date);
    const allowedStudentIds = new Set(
      roster.map((student) => String(student.student_id || '').trim()).filter(Boolean)
    );
    const previousStatusByStudentId = new Map(
      roster.map((student) => [String(student.student_id || '').trim(), student.status || null])
    );

    let savedCount = 0;

    for (const record of records) {
      const studentId = String(record.studentId || '').trim();
      const status = normalizeStatus(record.status);
      const previousStatus = previousStatusByStudentId.get(studentId) || null;

      if (!studentId || !status || !allowedStudentIds.has(studentId)) {
        continue;
      }

      await upsertAttendance({
        scheduleId,
        studentId,
        date,
        status,
        markedBy: req.user.id
      });

      const attendanceRecord = await db.get(
        `SELECT *
         FROM attendance
         WHERE schedule_id = ?
           AND student_id = ?
           AND date = ?`,
        [scheduleId, studentId, date]
      );

      await logAttendanceChange({
        attendanceId: attendanceRecord?.id,
        scheduleId,
        studentId,
        date,
        previousStatus,
        newStatus: status,
        changedBy: req.user.id
      });

      previousStatusByStudentId.set(studentId, status);
      savedCount += 1;
    }

    if (savedCount === 0) {
      return res.status(400).json({ error: 'No valid attendance updates were provided' });
    }

    const refreshedStudents = await getRosterForSchedule(session, date);

    await logSystemAudit({
      entityType: 'attendance',
      entityId: `${scheduleId}:${date}`,
      action: 'bulk-update',
      summary: `${req.user.email} saved attendance for ${savedCount} student(s)`,
      details: {
        scheduleId,
        date,
        savedCount,
        course_name: session.course_name || session.subject || null,
        group_name: session.group_name || null
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({
      message: 'Attendance saved successfully',
      date,
      savedCount,
      students: refreshedStudents,
      summary: buildSummary(refreshedStudents)
    });
  } catch (error) {
    console.error('Bulk attendance save error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const scheduleId = Number(req.body.scheduleId);
    const studentId = String(req.body.studentId || '').trim();
    const date = normalizeDateInput(req.body.date);
    const status = normalizeStatus(req.body.status);

    if (!scheduleId || !studentId || !date || !status) {
      return res.status(400).json({ error: 'Schedule, student, date, and valid status are required' });
    }

    const session = await getScheduleRecord(scheduleId);
    const accessError = getAccessError(session, req.user);
    if (accessError) {
      return res.status(accessError.status).json({ error: accessError.error });
    }

    const roster = await getRosterForSchedule(session, date);
    const selectedStudent = roster.find((student) => student.student_id === studentId);
    const isAllowedStudent = Boolean(selectedStudent);
    if (!isAllowedStudent) {
      return res.status(400).json({ error: 'Student does not belong to this schedule' });
    }

    await upsertAttendance({
      scheduleId,
      studentId,
      date,
      status,
      markedBy: req.user.id
    });

    const attendance = await db.get(
      `SELECT *
       FROM attendance
       WHERE schedule_id = ?
         AND student_id = ?
         AND date = ?`,
      [scheduleId, studentId, date]
    );

    await logAttendanceChange({
      attendanceId: attendance?.id,
      scheduleId,
      studentId,
      date,
      previousStatus: selectedStudent?.status || null,
      newStatus: status,
      changedBy: req.user.id
    });

    await logSystemAudit({
      entityType: 'attendance',
      entityId: `${scheduleId}:${studentId}:${date}`,
      action: selectedStudent?.status ? 'update' : 'create',
      summary: `${req.user.email} marked attendance for ${studentId}`,
      details: {
        scheduleId,
        studentId,
        date,
        status
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({ attendance });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/audit', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const conditions = [];
    const params = [];
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 300);

    if (req.query.scheduleId) {
      const scheduleId = Number(req.query.scheduleId);
      if (!Number.isFinite(scheduleId) || scheduleId <= 0) {
        return res.status(400).json({ error: 'Valid scheduleId is required' });
      }

      conditions.push('aal.schedule_id = ?');
      params.push(scheduleId);
    }

    if (req.query.studentId) {
      conditions.push('aal.student_id = ?');
      params.push(String(req.query.studentId).trim());
    }

    if (req.query.date) {
      const date = normalizeDateInput(req.query.date);
      if (!date) {
        return res.status(400).json({ error: 'Valid date is required' });
      }

      conditions.push('aal.date = ?');
      params.push(date);
    }

    if (!hasAdminAccess(req.user)) {
      conditions.push(`(
        c.teacher_id = ?
        OR COALESCE(s.teacher, '') = ?
        OR COALESCE(s.teacher, '') = ?
      )`);
      params.push(req.user.id, req.user.name, req.user.email);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const audit = await db.all(
      `SELECT
         aal.*,
         u.name AS changed_by_name,
         s.day,
         s.time_slot,
         s.subject,
         s.room,
         c.code AS course_code,
         c.name AS course_name
       FROM attendance_audit_log aal
       LEFT JOIN users u ON u.id = aal.changed_by
       LEFT JOIN schedule s ON s.id = aal.schedule_id
       LEFT JOIN courses c ON c.id = s.course_id
       ${whereClause}
       ORDER BY aal.changed_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    res.json({ audit });
  } catch (error) {
    console.error('Get attendance audit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/student/:studentId', auth, async (req, res) => {
  try {
    if (req.user.role === 'student' && req.user.student_id !== req.params.studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attendance = await db.all(
      `SELECT
         a.*,
         s.day,
         s.time_slot,
         s.subject,
         s.room,
         c.code AS course_code,
         c.name AS course_name,
         u.name AS marked_by_name
       FROM attendance a
       LEFT JOIN schedule s ON s.id = a.schedule_id
       LEFT JOIN courses c ON c.id = s.course_id
       LEFT JOIN users u ON u.id = a.marked_by
       WHERE a.student_id = ?
       ORDER BY a.date DESC, ${DAY_ORDER_SQL}, s.time_slot`,
      [req.params.studentId]
    );

    res.json({ attendance });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
