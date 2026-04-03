const express = require('express');

const router = express.Router();
const db = require('../config/database');
const { auth, isAdmin } = require('../middleware/auth');
const { runQueuedJobs } = require('../utils/platformOps');
const { canManageAcademicRecords, hasAdminAccess, isStudentAccount } = require('../utils/access');

const DEFAULT_RISK_WINDOW_DAYS = 45;
const DEFAULT_PERFORMANCE_WINDOW_DAYS = 120;

const normalizeBooleanFlag = (value) => (
  value === true
  || value === 1
  || value === '1'
);

const parseJsonSafely = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

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

const getDefaultPerformanceRange = () => {
  const to = normalizeDateInput(new Date());
  return {
    from: shiftDateInput(to, -(DEFAULT_PERFORMANCE_WINDOW_DAYS - 1)),
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

const getScopedStudentProfiles = async (user) => {
  if (hasAdminAccess(user)) {
    return db.all(
      `SELECT id, student_id, name, group_name, subgroup_name, faculty, major, program_class, advisor
       FROM users
       WHERE role = 'student'
       ORDER BY name`
    );
  }

  if (canManageAcademicRecords(user)) {
    return db.all(
      `SELECT DISTINCT u.id, u.student_id, u.name, u.group_name, u.subgroup_name, u.faculty, u.major, u.program_class, u.advisor
       FROM users u
       JOIN course_enrollments ce ON ce.student_id = u.id
       JOIN courses c ON c.id = ce.course_id
       WHERE u.role = 'student'
         AND c.teacher_id = ?
       ORDER BY u.name`,
      [user.id]
    );
  }

  if (isStudentAccount(user) && user.student_id) {
    return db.all(
      `SELECT id, student_id, name, group_name, subgroup_name, faculty, major, program_class, advisor
       FROM users
       WHERE role = 'student'
         AND student_id = ?`,
      [user.student_id]
    );
  }

  return [];
};

const averageNumbers = (values) => {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (numericValues.length === 0) {
    return null;
  }

  return Math.round(
    numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
  );
};

const getScopedAttendanceRecords = async ({ user, studentIds, from, to }) => {
  const studentIdFilter = buildInClause(studentIds);
  const params = [from, to, ...studentIdFilter.params];
  let sql = `
    SELECT
      a.student_id,
      a.status,
      a.date,
      COALESCE(c.name, s.subject, 'Scheduled class') AS subject,
      COALESCE(u.group_name, s.group_name, 'No group') AS group_name
    FROM attendance a
    LEFT JOIN schedule s ON s.id = a.schedule_id
    LEFT JOIN courses c ON c.id = s.course_id
    LEFT JOIN users u ON u.student_id = a.student_id
    WHERE a.date >= ?
      AND a.date <= ?
      AND a.student_id IN ${studentIdFilter.clause}
  `;

  if (canManageAcademicRecords(user) && !hasAdminAccess(user)) {
    sql += `
      AND (
        c.teacher_id = ?
        OR COALESCE(s.teacher, '') = ?
        OR COALESCE(s.teacher, '') = ?
      )
    `;
    params.push(user.id, user.name, user.email);
  }

  return db.all(sql, params);
};

const getScopedGradeRecords = async ({ user, studentIds, from, to }) => {
  const studentIdFilter = buildInClause(studentIds);
  const params = [...studentIdFilter.params, from, to];
  let sql = `
    SELECT
      g.student_id,
      g.grade,
      COALESCE(e.subject, 'Assessment') AS subject,
      COALESCE(u.group_name, e.group_name, 'No group') AS group_name,
      COALESCE(e.exam_date, DATE(g.graded_at)) AS grade_date
    FROM grades g
    LEFT JOIN exams e ON e.id = g.exam_id
    LEFT JOIN users u ON u.student_id = g.student_id
    WHERE g.student_id IN ${studentIdFilter.clause}
      AND COALESCE(e.exam_date, DATE(g.graded_at)) >= ?
      AND COALESCE(e.exam_date, DATE(g.graded_at)) <= ?
  `;

  if (canManageAcademicRecords(user) && !hasAdminAccess(user)) {
    sql += ' AND e.created_by = ?';
    params.push(user.id);
  }

  return db.all(sql, params);
};

const buildAttendanceSummaryMap = (attendanceRecords) => {
  const summaryMap = new Map();

  attendanceRecords.forEach((record) => {
    const key = String(record.student_id);
    const current = summaryMap.get(key) || {
      total_records: 0,
      attended_records: 0,
      absent_count: 0,
      late_count: 0,
      last_attendance_date: null
    };

    current.total_records += 1;
    if (['present', 'late', 'excused'].includes(record.status)) {
      current.attended_records += 1;
    }
    if (record.status === 'absent') {
      current.absent_count += 1;
    }
    if (record.status === 'late') {
      current.late_count += 1;
    }
    if (!current.last_attendance_date || String(record.date) > String(current.last_attendance_date)) {
      current.last_attendance_date = record.date;
    }

    summaryMap.set(key, current);
  });

  return summaryMap;
};

const buildGradeSummaryMap = (gradeRecords) => {
  const summaryMap = new Map();

  gradeRecords.forEach((record) => {
    const key = String(record.student_id);
    const current = summaryMap.get(key) || {
      total_grades: 0,
      average_grade: null,
      min_grade: null,
      fail_count: 0,
      last_grade_date: null,
      grade_sum: 0
    };
    const gradeValue = Number(record.grade || 0);

    current.total_grades += 1;
    current.grade_sum += gradeValue;
    current.average_grade = Math.round(current.grade_sum / current.total_grades);
    current.min_grade = current.min_grade === null
      ? gradeValue
      : Math.min(current.min_grade, gradeValue);
    if (gradeValue < 60) {
      current.fail_count += 1;
    }
    if (!current.last_grade_date || String(record.grade_date) > String(current.last_grade_date)) {
      current.last_grade_date = record.grade_date;
    }

    summaryMap.set(key, current);
  });

  return summaryMap;
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

const buildPerformanceDashboard = (profiles, attendanceRecords, gradeRecords, user) => {
  const studentMap = new Map(
    profiles.map((profile) => [
      String(profile.student_id),
      {
        studentId: profile.student_id,
        studentName: profile.name,
        groupName: profile.group_name || 'No group',
        subgroupName: profile.subgroup_name || null,
        attendanceTotal: 0,
        attendedCount: 0,
        totalGrades: 0,
        gradeSum: 0,
        strongestSubjects: new Map(),
        supportSubjects: new Map()
      }
    ])
  );
  const groupMap = new Map();

  const ensureGroupEntry = (groupName) => {
    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, {
        groupName,
        students: new Set(),
        attendanceTotal: 0,
        attendedCount: 0,
        gradeTotal: 0,
        gradeSum: 0,
        failCount: 0
      });
    }

    return groupMap.get(groupName);
  };

  attendanceRecords.forEach((record) => {
    const entry = studentMap.get(String(record.student_id));
    if (!entry) return;

    entry.attendanceTotal += 1;
    if (['present', 'late', 'excused'].includes(record.status)) {
      entry.attendedCount += 1;
    }

    const subjectBucket = entry.supportSubjects.get(record.subject) || {
      subject: record.subject,
      grades: [],
      attendanceTotal: 0,
      attendedCount: 0
    };
    subjectBucket.attendanceTotal += 1;
    if (['present', 'late', 'excused'].includes(record.status)) {
      subjectBucket.attendedCount += 1;
    }
    entry.supportSubjects.set(record.subject, subjectBucket);

    const groupEntry = ensureGroupEntry(record.group_name || entry.groupName || 'No group');
    groupEntry.students.add(entry.studentId);
    groupEntry.attendanceTotal += 1;
    if (['present', 'late', 'excused'].includes(record.status)) {
      groupEntry.attendedCount += 1;
    }
  });

  gradeRecords.forEach((record) => {
    const entry = studentMap.get(String(record.student_id));
    if (!entry) return;

    entry.totalGrades += 1;
    entry.gradeSum += Number(record.grade || 0);

    const strongestBucket = entry.strongestSubjects.get(record.subject) || {
      subject: record.subject,
      grades: []
    };
    strongestBucket.grades.push(Number(record.grade || 0));
    entry.strongestSubjects.set(record.subject, strongestBucket);

    const supportBucket = entry.supportSubjects.get(record.subject) || {
      subject: record.subject,
      grades: [],
      attendanceTotal: 0,
      attendedCount: 0
    };
    supportBucket.grades.push(Number(record.grade || 0));
    entry.supportSubjects.set(record.subject, supportBucket);

    const groupEntry = ensureGroupEntry(record.group_name || entry.groupName || 'No group');
    groupEntry.students.add(entry.studentId);
    groupEntry.gradeTotal += 1;
    groupEntry.gradeSum += Number(record.grade || 0);
    if (Number(record.grade || 0) < 60) {
      groupEntry.failCount += 1;
    }
  });

  const studentSnapshots = Array.from(studentMap.values())
    .map((entry) => {
      const attendanceRate = toRate(entry.attendedCount, entry.attendanceTotal);
      const averageGrade = entry.totalGrades > 0
        ? Math.round(entry.gradeSum / entry.totalGrades)
        : null;

      const strongestSubject = Array.from(entry.strongestSubjects.values())
        .map((bucket) => ({
          subject: bucket.subject,
          averageGrade: Math.round(bucket.grades.reduce((sum, value) => sum + value, 0) / bucket.grades.length)
        }))
        .sort((left, right) => right.averageGrade - left.averageGrade)[0] || null;

      const supportSubject = Array.from(entry.supportSubjects.values())
        .map((bucket) => {
          const averageGradeBySubject = bucket.grades.length
            ? Math.round(bucket.grades.reduce((sum, value) => sum + value, 0) / bucket.grades.length)
            : null;
          const attendanceRateBySubject = toRate(bucket.attendedCount || 0, bucket.attendanceTotal || 0);
          const supportScore = (
            Math.max(0, 75 - (averageGradeBySubject ?? 75))
            + Math.max(0, 80 - attendanceRateBySubject)
          );

          return {
            subject: bucket.subject,
            averageGrade: averageGradeBySubject,
            attendanceRate: attendanceRateBySubject,
            supportScore
          };
        })
        .sort((left, right) => right.supportScore - left.supportScore)[0] || null;

      return {
        studentId: entry.studentId,
        studentName: entry.studentName,
        groupName: entry.groupName,
        attendanceRate,
        totalGrades: entry.totalGrades,
        averageGrade,
        attendanceRecords: entry.attendanceTotal,
        strongestSubject,
        supportSubject
      };
    })
    .filter((entry) => entry.totalGrades > 0 || entry.attendanceRecords > 0);

  const groupPerformance = Array.from(groupMap.values())
    .map((entry) => ({
      groupName: entry.groupName,
      studentCount: entry.students.size,
      attendanceRate: toRate(entry.attendedCount, entry.attendanceTotal),
      averageGrade: entry.gradeTotal > 0 ? Math.round(entry.gradeSum / entry.gradeTotal) : null,
      totalGrades: entry.gradeTotal,
      failCount: entry.failCount
    }))
    .sort((left, right) => {
      const leftComposite = (left.averageGrade ?? 0) + left.attendanceRate;
      const rightComposite = (right.averageGrade ?? 0) + right.attendanceRate;
      return rightComposite - leftComposite;
    });

  const topStudents = studentSnapshots
    .filter((entry) => entry.averageGrade !== null)
    .sort((left, right) => {
      const rightComposite = (right.averageGrade ?? 0) + right.attendanceRate;
      const leftComposite = (left.averageGrade ?? 0) + left.attendanceRate;
      return rightComposite - leftComposite;
    })
    .slice(0, 5);

  const supportQueue = studentSnapshots
    .filter((entry) => (
      entry.averageGrade !== null
      ? entry.averageGrade < 70 || entry.attendanceRate < 75
      : entry.attendanceRate < 75
    ))
    .sort((left, right) => {
      const leftScore = Math.max(0, 75 - (left.averageGrade ?? 75)) + Math.max(0, 80 - left.attendanceRate);
      const rightScore = Math.max(0, 75 - (right.averageGrade ?? 75)) + Math.max(0, 80 - right.attendanceRate);
      return rightScore - leftScore;
    })
    .slice(0, 5);

  const summary = {
    studentsTracked: studentSnapshots.length,
    groupsTracked: groupPerformance.length,
    averageGrade: studentSnapshots.filter((entry) => entry.averageGrade !== null).length > 0
      ? Math.round(
          studentSnapshots
            .filter((entry) => entry.averageGrade !== null)
            .reduce((sum, entry) => sum + entry.averageGrade, 0)
          / studentSnapshots.filter((entry) => entry.averageGrade !== null).length
        )
      : null,
    averageAttendanceRate: studentSnapshots.length > 0
      ? Math.round(
          studentSnapshots.reduce((sum, entry) => sum + entry.attendanceRate, 0) / studentSnapshots.length
        )
      : 0,
    supportQueueSize: supportQueue.length
  };

  const studentSnapshot = isStudentAccount(user)
    ? (studentSnapshots[0] || null)
    : null;

  return {
    summary,
    groupPerformance: groupPerformance.slice(0, 6),
    topStudents,
    supportQueue,
    studentSnapshot,
    studentSnapshots
  };
};

const buildAnalyticsDataset = async ({ user, from, to }) => {
  const profiles = await getScopedStudentProfiles(user);
  if (profiles.length === 0) {
    return {
      profiles: [],
      attendanceRecords: [],
      gradeRecords: [],
      riskSnapshots: [],
      performanceDashboard: buildPerformanceDashboard([], [], [], user)
    };
  }

  const studentIds = profiles
    .map((profile) => String(profile.student_id || '').trim())
    .filter(Boolean);

  const [attendanceRecords, gradeRecords] = await Promise.all([
    getScopedAttendanceRecords({ user, studentIds, from, to }),
    getScopedGradeRecords({ user, studentIds, from, to })
  ]);

  const attendanceSummaryMap = buildAttendanceSummaryMap(attendanceRecords);
  const gradeSummaryMap = buildGradeSummaryMap(gradeRecords);
  const riskSnapshots = profiles
    .map((profile) => createStudentSnapshot(
      profile,
      attendanceSummaryMap.get(String(profile.student_id)),
      gradeSummaryMap.get(String(profile.student_id))
    ))
    .filter((snapshot) => snapshot.attendanceRecords > 0 || snapshot.totalGrades > 0);

  return {
    profiles,
    attendanceRecords,
    gradeRecords,
    riskSnapshots,
    performanceDashboard: buildPerformanceDashboard(profiles, attendanceRecords, gradeRecords, user)
  };
};

const buildFacultyReportRows = ({ profiles, riskSnapshots, performanceDashboard }) => {
  const profileByStudentId = new Map(
    profiles.map((profile) => [String(profile.student_id), profile])
  );
  const riskByStudentId = new Map(
    riskSnapshots.map((snapshot) => [String(snapshot.studentId), snapshot])
  );
  const performanceByStudentId = new Map(
    (performanceDashboard.studentSnapshots || []).map((snapshot) => [String(snapshot.studentId), snapshot])
  );
  const facultyMap = new Map();

  profiles.forEach((profile) => {
    const facultyKey = profile.faculty || 'Unassigned faculty';
    const performance = performanceByStudentId.get(String(profile.student_id));
    const risk = riskByStudentId.get(String(profile.student_id));
    const current = facultyMap.get(facultyKey) || {
      faculty: facultyKey,
      majors: new Set(),
      groups: new Set(),
      studentsTracked: 0,
      attendanceRates: [],
      gradeAverages: [],
      flaggedStudents: 0,
      criticalFlags: 0,
      watchFlags: 0,
      supportQueue: 0
    };

    current.studentsTracked += 1;
    if (profile.major) {
      current.majors.add(profile.major);
    }
    if (profile.group_name) {
      current.groups.add(profile.group_name);
    }

    const attendanceRate = performance?.attendanceRate ?? risk?.attendanceRate ?? null;
    const averageGrade = performance?.averageGrade ?? risk?.averageGrade ?? null;
    if (attendanceRate !== null) {
      current.attendanceRates.push(attendanceRate);
    }
    if (averageGrade !== null) {
      current.gradeAverages.push(averageGrade);
    }

    if (risk?.severity && risk.severity !== 'ok') {
      current.flaggedStudents += 1;
      if (risk.severity === 'critical') {
        current.criticalFlags += 1;
      }
      if (risk.severity === 'watch') {
        current.watchFlags += 1;
      }
    }

    if (performance && (
      (performance.averageGrade !== null && performance.averageGrade < 70)
      || performance.attendanceRate < 75
    )) {
      current.supportQueue += 1;
    }

    facultyMap.set(facultyKey, current);
  });

  return [...facultyMap.values()]
    .map((entry) => ({
      faculty: entry.faculty,
      majorsTracked: entry.majors.size,
      groupsTracked: entry.groups.size,
      studentsTracked: entry.studentsTracked,
      averageAttendanceRate: averageNumbers(entry.attendanceRates),
      averageGrade: averageNumbers(entry.gradeAverages),
      flaggedStudents: entry.flaggedStudents,
      criticalFlags: entry.criticalFlags,
      watchFlags: entry.watchFlags,
      supportQueue: entry.supportQueue
    }))
    .sort((left, right) => {
      if (right.flaggedStudents !== left.flaggedStudents) {
        return right.flaggedStudents - left.flaggedStudents;
      }
      return (left.faculty || '').localeCompare(right.faculty || '');
    });
};

const buildDeanOfficeRows = ({ profiles, riskSnapshots, performanceDashboard }) => {
  const profileByStudentId = new Map(
    profiles.map((profile) => [String(profile.student_id), profile])
  );
  const performanceByStudentId = new Map(
    (performanceDashboard.studentSnapshots || []).map((snapshot) => [String(snapshot.studentId), snapshot])
  );

  return riskSnapshots
    .filter((snapshot) => snapshot.severity !== 'ok')
    .map((snapshot) => {
      const profile = profileByStudentId.get(String(snapshot.studentId));
      const performance = performanceByStudentId.get(String(snapshot.studentId));

      return {
        studentId: snapshot.studentId,
        studentName: snapshot.studentName,
        faculty: profile?.faculty || 'Unassigned faculty',
        major: profile?.major || 'Not set',
        advisor: profile?.advisor || 'Not set',
        groupName: snapshot.groupName || profile?.group_name || 'No group',
        attendanceRate: snapshot.attendanceRate,
        averageGrade: performance?.averageGrade ?? snapshot.averageGrade,
        severity: snapshot.severity,
        riskScore: Math.round(snapshot.riskScore),
        reasons: snapshot.reasons.join(' | '),
        supportSubject: performance?.supportSubject?.subject || 'General academic support',
        lastAttendanceDate: snapshot.lastAttendanceDate || 'No records',
        lastGradeDate: snapshot.lastGradeDate || 'No records'
      };
    })
    .sort((left, right) => {
      if (left.severity !== right.severity) {
        return left.severity === 'critical' ? -1 : 1;
      }
      return right.riskScore - left.riskScore;
    });
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

router.get('/performance-dashboard', auth, async (req, res) => {
  try {
    const defaultRange = getDefaultPerformanceRange();
    const from = req.query.from ? normalizeDateInput(req.query.from) : defaultRange.from;
    const to = req.query.to ? normalizeDateInput(req.query.to) : defaultRange.to;

    if (!from || !to) {
      return res.status(400).json({ error: 'Valid from and to dates are required' });
    }

    if (from > to) {
      return res.status(400).json({ error: 'The start date must be earlier than the end date' });
    }

    const profiles = await getScopedStudentProfiles(req.user);
    if (profiles.length === 0) {
      return res.json({
        from,
        to,
        summary: {
          studentsTracked: 0,
          groupsTracked: 0,
          averageGrade: null,
          averageAttendanceRate: 0,
          supportQueueSize: 0
        },
        groupPerformance: [],
        topStudents: [],
        supportQueue: [],
        studentSnapshot: null
      });
    }

    const studentIds = profiles
      .map((profile) => String(profile.student_id || '').trim())
      .filter(Boolean);

    const [attendanceRecords, gradeRecords] = await Promise.all([
      getScopedAttendanceRecords({ user: req.user, studentIds, from, to }),
      getScopedGradeRecords({ user: req.user, studentIds, from, to })
    ]);

    res.json({
      from,
      to,
      ...buildPerformanceDashboard(profiles, attendanceRecords, gradeRecords, req.user)
    });
  } catch (error) {
    console.error('Ops performance dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reports/faculty-overview', auth, isAdmin, async (req, res) => {
  try {
    const defaultRange = getDefaultPerformanceRange();
    const from = req.query.from ? normalizeDateInput(req.query.from) : defaultRange.from;
    const to = req.query.to ? normalizeDateInput(req.query.to) : defaultRange.to;

    if (!from || !to) {
      return res.status(400).json({ error: 'Valid from and to dates are required' });
    }

    if (from > to) {
      return res.status(400).json({ error: 'The start date must be earlier than the end date' });
    }

    const dataset = await buildAnalyticsDataset({ user: req.user, from, to });
    const rows = buildFacultyReportRows(dataset);

    res.json({
      from,
      to,
      summary: {
        faculties: rows.length,
        studentsTracked: dataset.profiles.length,
        flaggedStudents: dataset.riskSnapshots.filter((snapshot) => snapshot.severity !== 'ok').length,
        supportQueue: dataset.performanceDashboard.summary.supportQueueSize
      },
      rows
    });
  } catch (error) {
    console.error('Faculty overview report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reports/dean-office', auth, isAdmin, async (req, res) => {
  try {
    const defaultRange = getDefaultPerformanceRange();
    const from = req.query.from ? normalizeDateInput(req.query.from) : defaultRange.from;
    const to = req.query.to ? normalizeDateInput(req.query.to) : defaultRange.to;

    if (!from || !to) {
      return res.status(400).json({ error: 'Valid from and to dates are required' });
    }

    if (from > to) {
      return res.status(400).json({ error: 'The start date must be earlier than the end date' });
    }

    const dataset = await buildAnalyticsDataset({ user: req.user, from, to });
    const rows = buildDeanOfficeRows(dataset);

    res.json({
      from,
      to,
      summary: {
        interventions: rows.length,
        critical: rows.filter((row) => row.severity === 'critical').length,
        watch: rows.filter((row) => row.severity === 'watch').length
      },
      rows
    });
  } catch (error) {
    console.error('Dean office report error:', error);
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

    const normalizedNotifications = notifications.map((notification) => ({
      ...notification,
      metadata: parseJsonSafely(notification.metadata),
      is_read: normalizeBooleanFlag(notification.is_read)
    }));

    res.json({
      notifications: normalizedNotifications,
      summary: {
        total: normalizedNotifications.length,
        unread: normalizedNotifications.filter((notification) => !notification.is_read).length
      }
    });
  } catch (error) {
    console.error('Get notification inbox error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/notifications/me/read-all', auth, async (req, res) => {
  try {
    await db.run(
      `UPDATE notification_inbox
       SET is_read = ?, status = CASE WHEN status = 'delivered' THEN 'read' ELSE status END
       WHERE user_id = ?`,
      [db.client === 'postgres' ? true : 1, req.user.id]
    );

    const unreadRow = await db.get(
      `SELECT COUNT(*) AS unread_count
       FROM notification_inbox
       WHERE user_id = ?
         AND is_read = ?`,
      [req.user.id, db.client === 'postgres' ? false : 0]
    );

    res.json({
      message: 'Notifications marked as read',
      summary: {
        unread: Number(unreadRow?.unread_count || 0)
      }
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: 'Notification id is invalid' });
    }

    const existingNotification = await db.get(
      `SELECT *
       FROM notification_inbox
       WHERE id = ?
         AND user_id = ?`,
      [notificationId, req.user.id]
    );

    if (!existingNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await db.run(
      `UPDATE notification_inbox
       SET is_read = ?, status = CASE WHEN status = 'delivered' THEN 'read' ELSE status END
       WHERE id = ?
         AND user_id = ?`,
      [db.client === 'postgres' ? true : 1, notificationId, req.user.id]
    );

    const updatedNotification = await db.get(
      `SELECT *
       FROM notification_inbox
       WHERE id = ?
         AND user_id = ?`,
      [notificationId, req.user.id]
    );

    res.json({
      notification: {
        ...updatedNotification,
        metadata: parseJsonSafely(updatedNotification.metadata),
        is_read: true
      }
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
