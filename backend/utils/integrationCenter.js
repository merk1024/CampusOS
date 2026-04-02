const fs = require('fs');
const os = require('os');
const path = require('path');

const db = require('../config/database');
const {
  runImportWorkflow,
  runReconciliationWorkflow
} = require('../scripts/lib/pilot-import');

const SUBJECT_SELECTION_TEMPLATES = {
  courses: ['course_code,course_name,semester', 'CS305,Information Security,Spring 2026'].join('\n'),
  enrollments: ['student_id,course_code,enrolled_at', '240141052,CS305,2026-04-02'].join('\n')
};

const ACADEMIC_RECORDS_TEMPLATES = {
  grades: ['student_id,course_code,assessment_type,grade,graded_at', '240141052,CS305,Midterm,91,2026-04-02'].join('\n'),
  attendance: ['student_id,course_code,date,status', '240141052,CS305,2026-04-02,present'].join('\n')
};

const ensureText = (value) => String(value || '').trim();
const normalizeEmail = (value) => ensureText(value).toLowerCase();
const normalizeKeyToken = (value) => ensureText(value).toUpperCase();
const normalizeDate = (value) => {
  const cleaned = ensureText(value);
  if (!cleaned) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const detectDelimiter = (text) => {
  const firstLine = ensureText(text).split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
};

const parseDelimitedLine = (line, delimiter) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
};

const parseTableText = (text) => {
  const normalized = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const delimiter = detectDelimiter(normalized);
  const lines = normalized
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const headers = parseDelimitedLine(lines[0], delimiter)
    .map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));

  return lines.slice(1).map((line) => {
    const cells = parseDelimitedLine(line, delimiter);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = ensureText(cells[index]);
    });

    return row;
  });
};

const getAliasedValue = (row, aliases) => {
  for (const alias of aliases) {
    const value = row[alias];
    if (ensureText(value)) {
      return ensureText(value);
    }
  }

  return '';
};

const createTempWorkspace = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

const cleanupTempWorkspace = (directoryPath) => {
  try {
    fs.rmSync(directoryPath, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'EPERM') {
      throw error;
    }
  }
};

const writeSnapshotFile = (directoryPath, filename, contents) => {
  const filePath = path.join(directoryPath, filename);
  fs.writeFileSync(filePath, String(contents || ''), 'utf8');
  return filePath;
};

const summarizeReconciliationFindings = (findings = []) => ({
  mismatches: findings.filter((finding) => finding.status === 'mismatch').length,
  onlyInExport: findings.filter((finding) => finding.status === 'only_in_export').length,
  onlyInCampusOS: findings.filter((finding) => finding.status === 'only_in_campusos').length,
  duplicateExport: findings.filter((finding) => finding.status === 'duplicate_export').length,
  duplicateCampusOS: findings.filter((finding) => finding.status === 'duplicate_campusos').length
});

const getCampusIntegrationOverview = async () => {
  const [
    studentCount,
    teacherCount,
    courseCount,
    enrollmentCount,
    scheduleCount,
    gradeCount,
    attendanceCount
  ] = await Promise.all([
    db.get(`SELECT COUNT(*) AS count FROM users WHERE role = 'student'`),
    db.get(`SELECT COUNT(*) AS count FROM users WHERE role = 'teacher'`),
    db.get('SELECT COUNT(*) AS count FROM courses'),
    db.get('SELECT COUNT(*) AS count FROM course_enrollments'),
    db.get('SELECT COUNT(*) AS count FROM schedule'),
    db.get('SELECT COUNT(*) AS count FROM grades'),
    db.get('SELECT COUNT(*) AS count FROM attendance')
  ]);

  return {
    students: Number(studentCount?.count || 0),
    teachers: Number(teacherCount?.count || 0),
    courses: Number(courseCount?.count || 0),
    enrollments: Number(enrollmentCount?.count || 0),
    scheduleEntries: Number(scheduleCount?.count || 0),
    grades: Number(gradeCount?.count || 0),
    attendanceRecords: Number(attendanceCount?.count || 0)
  };
};

const runSubjectSelectionAnalysis = async ({
  sourceName = 'Subject Selection Export',
  coursesCsvText = '',
  enrollmentsCsvText = ''
}) => {
  const hasCourses = ensureText(coursesCsvText);
  const hasEnrollments = ensureText(enrollmentsCsvText);

  if (!hasCourses && !hasEnrollments) {
    throw new Error('Provide at least one subject selection snapshot before running integration analysis.');
  }

  const tempDir = createTempWorkspace('campusos-subject-selection-');

  try {
    const coursesFile = hasCourses
      ? writeSnapshotFile(tempDir, 'courses.csv', coursesCsvText)
      : null;
    const enrollmentsFile = hasEnrollments
      ? writeSnapshotFile(tempDir, 'enrollments.csv', enrollmentsCsvText)
      : null;

    const { report } = await runReconciliationWorkflow({
      coursesFile,
      enrollmentsFile,
      sourceLabel: sourceName,
      reportStem: path.join(tempDir, 'subject-selection-reconciliation')
    });

    const campusOverview = await getCampusIntegrationOverview();
    const courseSummary = report.summary.courses || null;
    const enrollmentSummary = report.summary.enrollments || null;
    const findingSummary = summarizeReconciliationFindings(report.findings);

    return {
      source: {
        key: 'subject-selection',
        label: 'Subject Selection',
        sourceName
      },
      campusOverview,
      overview: {
        externalCourses: Number(courseSummary?.rowsInExport || 0),
        externalSelections: Number(enrollmentSummary?.rowsInExport || 0),
        matchedCourses: Number(courseSummary?.matched || 0),
        matchedSelections: Number(enrollmentSummary?.matched || 0),
        pendingCourseConflicts: Number(courseSummary?.mismatched || 0) + Number(courseSummary?.onlyInExport || 0),
        pendingSelectionConflicts: Number(enrollmentSummary?.mismatched || 0) + Number(enrollmentSummary?.onlyInExport || 0),
        totalFindings: report.findings.length
      },
      summary: report.summary,
      findings: report.findings,
      findingSummary,
      issues: report.issues,
      templates: SUBJECT_SELECTION_TEMPLATES
    };
  } finally {
    cleanupTempWorkspace(tempDir);
  }
};

const applySubjectSelectionOverride = async ({
  sourceName = 'Subject Selection Override',
  coursesCsvText = '',
  enrollmentsCsvText = ''
}) => {
  const hasCourses = ensureText(coursesCsvText);
  const hasEnrollments = ensureText(enrollmentsCsvText);

  if (!hasCourses && !hasEnrollments) {
    throw new Error('Provide at least one subject selection snapshot before applying an override.');
  }

  const tempDir = createTempWorkspace('campusos-subject-selection-override-');

  try {
    const coursesFile = hasCourses
      ? writeSnapshotFile(tempDir, 'courses.csv', coursesCsvText)
      : null;
    const enrollmentsFile = hasEnrollments
      ? writeSnapshotFile(tempDir, 'enrollments.csv', enrollmentsCsvText)
      : null;

    const { report } = await runImportWorkflow({
      coursesFile,
      enrollmentsFile,
      apply: true,
      sourceLabel: sourceName,
      reportStem: path.join(tempDir, 'subject-selection-override')
    });

    return {
      source: {
        key: 'subject-selection',
        label: 'Subject Selection',
        sourceName
      },
      campusOverview: await getCampusIntegrationOverview(),
      summary: report.summary,
      issues: report.issues,
      preview: report.preview,
      templates: SUBJECT_SELECTION_TEMPLATES
    };
  } finally {
    cleanupTempWorkspace(tempDir);
  }
};

const loadUserLookups = async () => {
  const users = await db.all(
    `SELECT id, student_id, email, name
     FROM users
     WHERE role = 'student'`
  );

  const byStudentId = new Map();
  const byEmail = new Map();

  users.forEach((user) => {
    if (ensureText(user.student_id)) {
      byStudentId.set(ensureText(user.student_id), user);
    }
    if (ensureText(user.email)) {
      byEmail.set(normalizeEmail(user.email), user);
    }
  });

  return { byStudentId, byEmail };
};

const resolveStudentReference = (studentId, studentEmail, lookups) => {
  const cleanedStudentId = ensureText(studentId);
  if (cleanedStudentId) {
    return cleanedStudentId;
  }

  const cleanedEmail = normalizeEmail(studentEmail);
  if (!cleanedEmail) {
    return '';
  }

  return ensureText(lookups.byEmail.get(cleanedEmail)?.student_id) || cleanedEmail;
};

const normalizeExternalGradeRecord = (row, lookups) => {
  const studentId = getAliasedValue(row, ['student_id', 'studentid', 'student_number']);
  const studentEmail = getAliasedValue(row, ['student_email', 'email', 'student_mail']);
  const courseCode = getAliasedValue(row, ['course_code', 'code', 'subject_code']);
  const subject = getAliasedValue(row, ['subject', 'subject_name', 'course_name']);
  const assessmentType = getAliasedValue(row, ['assessment_type', 'type', 'exam_type']) || 'GENERAL';
  const gradeValue = Number(getAliasedValue(row, ['grade', 'score', 'points']));

  return {
    studentKey: resolveStudentReference(studentId, studentEmail, lookups),
    courseKey: normalizeKeyToken(courseCode || subject),
    assessmentType: normalizeKeyToken(assessmentType || 'GENERAL'),
    grade: Number.isFinite(gradeValue) ? gradeValue : null,
    gradedAt: normalizeDate(getAliasedValue(row, ['graded_at', 'updated_at', 'date']))
  };
};

const normalizeExternalAttendanceRecord = (row, lookups) => {
  const studentId = getAliasedValue(row, ['student_id', 'studentid', 'student_number']);
  const studentEmail = getAliasedValue(row, ['student_email', 'email', 'student_mail']);
  const courseCode = getAliasedValue(row, ['course_code', 'code', 'subject_code']);
  const subject = getAliasedValue(row, ['subject', 'subject_name', 'course_name']);

  return {
    studentKey: resolveStudentReference(studentId, studentEmail, lookups),
    courseKey: normalizeKeyToken(courseCode || subject),
    date: normalizeDate(getAliasedValue(row, ['date', 'attendance_date'])),
    status: ensureText(getAliasedValue(row, ['status', 'attendance_status'])).toLowerCase()
  };
};

const loadCampusGrades = async () => {
  const rows = await db.all(`
    SELECT
      g.student_id,
      LOWER(u.email) AS student_email,
      UPPER(COALESCE(c.code, e.subject, '')) AS course_key,
      UPPER(COALESCE(e.type, 'GENERAL')) AS assessment_type,
      g.grade,
      g.graded_at
    FROM grades g
    JOIN exams e ON e.id = g.exam_id
    LEFT JOIN courses c ON c.id = e.course_id
    LEFT JOIN users u ON u.student_id = g.student_id
  `);

  return rows.map((row) => ({
    studentKey: ensureText(row.student_id) || normalizeEmail(row.student_email),
    courseKey: normalizeKeyToken(row.course_key),
    assessmentType: normalizeKeyToken(row.assessment_type || 'GENERAL'),
    grade: Number.isFinite(Number(row.grade)) ? Number(row.grade) : null,
    gradedAt: normalizeDate(row.graded_at)
  }));
};

const loadCampusAttendance = async () => {
  const rows = await db.all(`
    SELECT
      a.student_id,
      LOWER(u.email) AS student_email,
      UPPER(COALESCE(c.code, s.subject, '')) AS course_key,
      a.date,
      LOWER(COALESCE(a.status, '')) AS status
    FROM attendance a
    LEFT JOIN users u ON u.student_id = a.student_id
    LEFT JOIN schedule s ON s.id = a.schedule_id
    LEFT JOIN courses c ON c.id = s.course_id
  `);

  return rows.map((row) => ({
    studentKey: ensureText(row.student_id) || normalizeEmail(row.student_email),
    courseKey: normalizeKeyToken(row.course_key),
    date: normalizeDate(row.date),
    status: ensureText(row.status).toLowerCase()
  }));
};

const buildGradeKey = (record) => [
  record.studentKey,
  record.courseKey,
  record.assessmentType || 'GENERAL'
].join('|');

const buildAttendanceKey = (record) => [
  record.studentKey,
  record.courseKey,
  record.date
].join('|');

const compareRecords = ({ label, sourceRecords, campusRecords, keyBuilder, diffFields }) => {
  const summary = {
    label,
    rowsInSource: sourceRecords.length,
    rowsInCampusOS: campusRecords.length,
    matched: 0,
    mismatched: 0,
    onlyInSource: 0,
    onlyInCampusOS: 0,
    invalid: 0
  };

  const findings = [];
  const issues = [];

  const sourceIndex = new Map();
  const campusIndex = new Map();

  sourceRecords.forEach((record, index) => {
    const key = keyBuilder(record);
    if (!record.studentKey || !record.courseKey || key.includes('||')) {
      summary.invalid += 1;
      issues.push({
        severity: 'error',
        entity: label.toLowerCase(),
        rowNumber: index + 2,
        message: 'Missing student or course reference in source snapshot.'
      });
      return;
    }

    sourceIndex.set(key, record);
  });

  campusRecords.forEach((record) => {
    const key = keyBuilder(record);
    if (key.includes('||')) {
      return;
    }

    campusIndex.set(key, record);
  });

  sourceIndex.forEach((sourceRecord, key) => {
    const campusRecord = campusIndex.get(key);
    if (!campusRecord) {
      summary.onlyInSource += 1;
      findings.push({
        entity: label.toLowerCase(),
        key,
        status: 'only_in_source',
        sourceRecord
      });
      return;
    }

    const differences = diffFields
      .filter((field) => String(sourceRecord[field] ?? '') !== String(campusRecord[field] ?? ''))
      .map((field) => ({
        field,
        sourceValue: sourceRecord[field] ?? null,
        campusValue: campusRecord[field] ?? null
      }));

    if (differences.length > 0) {
      summary.mismatched += 1;
      findings.push({
        entity: label.toLowerCase(),
        key,
        status: 'mismatch',
        differences
      });
      return;
    }

    summary.matched += 1;
  });

  campusIndex.forEach((campusRecord, key) => {
    if (!sourceIndex.has(key)) {
      summary.onlyInCampusOS += 1;
      findings.push({
        entity: label.toLowerCase(),
        key,
        status: 'only_in_campusos',
        campusRecord
      });
    }
  });

  return { summary, findings, issues };
};

const runAcademicRecordsAnalysis = async ({
  sourceName = 'Academic Records Export',
  gradesCsvText = '',
  attendanceCsvText = ''
}) => {
  const hasGrades = ensureText(gradesCsvText);
  const hasAttendance = ensureText(attendanceCsvText);

  if (!hasGrades && !hasAttendance) {
    throw new Error('Provide grades and/or attendance snapshots before running integration analysis.');
  }

  const studentLookups = await loadUserLookups();
  const campusGrades = await loadCampusGrades();
  const campusAttendance = await loadCampusAttendance();

  const externalGrades = hasGrades
    ? parseTableText(gradesCsvText).map((row) => normalizeExternalGradeRecord(row, studentLookups))
    : [];
  const externalAttendance = hasAttendance
    ? parseTableText(attendanceCsvText).map((row) => normalizeExternalAttendanceRecord(row, studentLookups))
    : [];

  const gradeReport = compareRecords({
    label: 'Grades',
    sourceRecords: externalGrades,
    campusRecords: campusGrades,
    keyBuilder: buildGradeKey,
    diffFields: ['grade']
  });

  const attendanceReport = compareRecords({
    label: 'Attendance',
    sourceRecords: externalAttendance,
    campusRecords: campusAttendance,
    keyBuilder: buildAttendanceKey,
    diffFields: ['status']
  });

  const findings = [...gradeReport.findings, ...attendanceReport.findings];
  const issues = [...gradeReport.issues, ...attendanceReport.issues];

  return {
    source: {
      key: 'academic-records',
      label: 'Grades and Attendance',
      sourceName
    },
    campusOverview: await getCampusIntegrationOverview(),
    overview: {
      externalGrades: externalGrades.length,
      externalAttendance: externalAttendance.length,
      matchedGrades: gradeReport.summary.matched,
      matchedAttendance: attendanceReport.summary.matched,
      gradeConflicts: gradeReport.summary.mismatched + gradeReport.summary.onlyInSource,
      attendanceConflicts: attendanceReport.summary.mismatched + attendanceReport.summary.onlyInSource,
      totalFindings: findings.length
    },
    summary: {
      grades: gradeReport.summary,
      attendance: attendanceReport.summary
    },
    findings,
    findingSummary: {
      mismatches: findings.filter((finding) => finding.status === 'mismatch').length,
      onlyInSource: findings.filter((finding) => finding.status === 'only_in_source').length,
      onlyInCampusOS: findings.filter((finding) => finding.status === 'only_in_campusos').length
    },
    issues,
    templates: ACADEMIC_RECORDS_TEMPLATES
  };
};

module.exports = {
  SUBJECT_SELECTION_TEMPLATES,
  ACADEMIC_RECORDS_TEMPLATES,
  getCampusIntegrationOverview,
  runSubjectSelectionAnalysis,
  applySubjectSelectionOverride,
  runAcademicRecordsAnalysis
};
