const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-reconciliation-tests-'));
const sqliteDbPath = path.join(tempDir, 'campusos-reconciliation-test.db');

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = sqliteDbPath;
process.env.JWT_SECRET = 'campusos-reconciliation-test-secret';
process.env.SUPERADMIN_BOOTSTRAP_PASSWORD = 'SuperAdmin123!';
process.env.SEED_ADMIN_PASSWORD = 'Admin123!';
process.env.SEED_TEACHER_PASSWORD = 'Teacher123!';
process.env.SEED_STUDENT_PASSWORD = 'Student123!';

const seed = require('../seeds/seed');
const { runReconciliationWorkflow } = require('../scripts/lib/pilot-import');

const files = {
  students: path.join(tempDir, 'students.csv'),
  teachers: path.join(tempDir, 'teachers.csv'),
  courses: path.join(tempDir, 'courses.csv'),
  enrollments: path.join(tempDir, 'enrollments.csv'),
  schedule: path.join(tempDir, 'schedule.csv')
};

const writeFile = (targetPath, contents) => {
  fs.writeFileSync(targetPath, contents.trim());
};

test.before(async () => {
  await seed();

  writeFile(
    files.students,
    `
student_id,name,email,group_name,phone
240141052,Erbol Abdusaitov,erbol.abdusaitov1@alatoo.edu.kg,CYB-23,+996700399999
240199001,Nuraiym Satybaldieva,nuraiym.satybaldieva@alatoo.edu.kg,CYB-24,+996700399002
`
  );

  writeFile(
    files.teachers,
    `
name,email
Azhar Kazakbaeva,teacher@alatoo.edu.kg
`
  );

  writeFile(
    files.courses,
    `
code,name
CYB201,Cybersecurity Fundamentals
`
  );

  writeFile(
    files.enrollments,
    `
student_id,course_code
240141052,CYB201
`
  );

  writeFile(
    files.schedule,
    `
course_code,day,time_slot,group_name,audience_type,room
CYB201,Monday,08:00-08:40,CYB-23,group,A-999
`
  );
});

test.after(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'EPERM') {
      throw error;
    }
  }
});

test('reconciliation workflow reports matches, mismatches, and external-only rows without writing', async () => {
  const { report, artifacts } = await runReconciliationWorkflow({
    studentsFile: files.students,
    teachersFile: files.teachers,
    coursesFile: files.courses,
    enrollmentsFile: files.enrollments,
    scheduleFile: files.schedule,
    sourceLabel: 'reconciliation-test',
    reportStem: path.join(tempDir, 'reconciliation-report')
  });

  assert.equal(report.summary.students.rowsInExport, 2);
  assert.equal(report.summary.students.mismatched, 1);
  assert.equal(report.summary.students.onlyInExport, 1);
  assert.ok(report.summary.students.onlyInCampusOS >= 1);

  assert.equal(report.summary.teachers.matched, 1);
  assert.equal(report.summary.courses.matched, 1);
  assert.equal(report.summary.enrollments.matched, 1);
  assert.equal(report.summary.schedule.mismatched, 1);

  const studentMismatch = report.findings.find(
    (finding) => finding.entity === 'students' && finding.status === 'mismatch' && finding.key === '240141052'
  );
  assert.ok(studentMismatch);
  assert.ok(studentMismatch.differences.some((diff) => diff.field === 'phone'));

  const exportOnlyStudent = report.findings.find(
    (finding) => finding.entity === 'students' && finding.status === 'only_in_export' && finding.key === '240199001'
  );
  assert.ok(exportOnlyStudent);

  assert.ok(fs.existsSync(artifacts.jsonPath));
  assert.ok(fs.existsSync(artifacts.markdownPath));
});
