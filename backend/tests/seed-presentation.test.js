const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-seed-presentation-'));
const sqliteDbPath = path.join(tempDir, 'presentation-seed.db');

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = sqliteDbPath;
process.env.JWT_SECRET = 'campusos-presentation-seed-secret';
process.env.SUPERADMIN_BOOTSTRAP_PASSWORD = 'SuperAdmin123!';
process.env.SEED_ADMIN_PASSWORD = 'Admin123!';
process.env.SEED_TEACHER_PASSWORD = 'Teacher123!';
process.env.SEED_STUDENT_PASSWORD = 'Student123!';

const seed = require('../seeds/seed');
const db = require('../config/database');

test.before(async () => {
  await seed();
});

test.after(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'EPERM' && error?.code !== 'EBUSY') {
      throw error;
    }
  }
});

test('seed builds presentation-ready demo academics with audits', async () => {
  const assignmentCount = await db.get('SELECT COUNT(*) AS total FROM assignments');
  const examCount = await db.get('SELECT COUNT(*) AS total FROM exams');
  const examGroupCount = await db.get('SELECT COUNT(DISTINCT group_name) AS total FROM exams');
  const gradeCount = await db.get('SELECT COUNT(*) AS total FROM grades');
  const gradeAuditCount = await db.get('SELECT COUNT(*) AS total FROM grade_audit_log');
  const attendanceCount = await db.get('SELECT COUNT(*) AS total FROM attendance');
  const attendanceAuditCount = await db.get('SELECT COUNT(*) AS total FROM attendance_audit_log');
  const absentCount = await db.get(
    'SELECT COUNT(*) AS total FROM attendance WHERE status = ?',
    ['absent']
  );
  const assignmentWithCourse = await db.get(
    `SELECT a.id
     FROM assignments a
     INNER JOIN courses c ON c.id = a.course_id
     WHERE c.code = ? AND a.title = ?`,
    ['CYB201', 'Threat Model Review']
  );
  const examWithStudents = await db.get(
    `SELECT e.id, COUNT(es.id) AS student_total
     FROM exams e
     LEFT JOIN exam_students es ON es.exam_id = e.id
     WHERE e.type = ?
     GROUP BY e.id
     ORDER BY student_total DESC
     LIMIT 1`,
    ['Midterm']
  );

  assert.equal(Number(assignmentCount.total), 8);
  assert.equal(Number(examCount.total), 8);
  assert.equal(Number(examGroupCount.total), 6);
  assert.equal(Number(gradeCount.total), 21);
  assert.ok(Number(gradeAuditCount.total) >= 23);
  assert.equal(Number(attendanceCount.total), 60);
  assert.ok(Number(attendanceAuditCount.total) > Number(attendanceCount.total));
  assert.ok(Number(absentCount.total) >= 2);
  assert.ok(assignmentWithCourse);
  assert.ok(examWithStudents);
  assert.ok(Number(examWithStudents.student_total) >= 3);
});
