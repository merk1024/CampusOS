const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-import-tests-'));
const sqliteDbPath = path.join(tempDir, 'campusos-import-test.db');

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = sqliteDbPath;
process.env.JWT_SECRET = 'campusos-import-test-secret';
process.env.SUPERADMIN_BOOTSTRAP_PASSWORD = 'SuperAdmin123!';
process.env.SEED_ADMIN_PASSWORD = 'Admin123!';
process.env.SEED_TEACHER_PASSWORD = 'Teacher123!';
process.env.SEED_STUDENT_PASSWORD = 'Student123!';
process.env.IMPORT_DEFAULT_PASSWORD = 'Import123!';

const seed = require('../seeds/seed');
const db = require('../config/database');
const { runImportWorkflow } = require('../scripts/lib/pilot-import');

const files = {
  students: path.join(tempDir, 'students.csv'),
  teachers: path.join(tempDir, 'teachers.csv'),
  courses: path.join(tempDir, 'courses.csv'),
  enrollments: path.join(tempDir, 'enrollments.csv'),
  schedule: path.join(tempDir, 'schedule.csv'),
  studentsXlsx: path.join(tempDir, 'students.xlsx')
};

const writeFile = (targetPath, contents) => {
  fs.writeFileSync(targetPath, contents.trim());
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bishkek',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const getDatePrefix = (value) => {
  if (value instanceof Date) {
    return DATE_FORMATTER.format(value);
  }

  return String(value).slice(0, 10);
};

test.before(async () => {
  await seed();

  writeFile(
    files.students,
    `
student_id,name,email,group_name,subgroup_name,faculty,major,year_of_study,phone,advisor,study_status,grant_type,program_class,registration_date
240141052,Erbol Abdusaitov,erbol.abdusaitov1@alatoo.edu.kg,CYB-23,1-Group,School of Engineering and Applied Sciences,Cybersecurity,4,+996700399001,Azhar Kazakbaeva,active,contract,CYB-23-A,2023-09-01
240199001,Nuraiym Satybaldieva,nuraiym.satybaldieva@alatoo.edu.kg,CYB-24,1-Group,School of Engineering and Applied Sciences,Cybersecurity,2,+996700399002,Azhar Kazakbaeva,active,grant,CYB-24-A,2024-09-01
`
  );

  writeFile(
    files.teachers,
    `
name,email,faculty,major,phone,address
Azhar Kazakbaeva,teacher@alatoo.edu.kg,School of Engineering and Applied Sciences,Cybersecurity,+996700499001,Office A-302
Adilbek Temirov,adilbek.temirov@alatoo.edu.kg,School of Engineering and Applied Sciences,Threat Intelligence,+996700499002,Office C-210
`
  );

  writeFile(
    files.courses,
    `
code,name,description,credits,semester,teacher_email
CYB201,Cybersecurity Fundamentals Extended,Updated pilot syllabus for the core security course,5,Spring 2026,teacher@alatoo.edu.kg
NET330,Threat Intelligence Workshop,Practical threat intel workflows for pilot teams,3,Fall 2026,adilbek.temirov@alatoo.edu.kg
`
  );

  writeFile(
    files.enrollments,
    `
student_id,student_email,course_code,enrolled_at
240141052,erbol.abdusaitov1@alatoo.edu.kg,CYB201,2026-02-01
240199001,nuraiym.satybaldieva@alatoo.edu.kg,NET330,2026-02-02
`
  );

  writeFile(
    files.schedule,
    `
course_code,day,time_slot,group_name,audience_type,subgroup_name,student_email,room,subject,teacher
CYB201,Monday,08:00-08:40,CYB-23,group,,,A-305,Cybersecurity Fundamentals Extended,
NET330,Friday,15:30-16:10,,individual,,nuraiym.satybaldieva@alatoo.edu.kg,C-3,, 
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

test('preview mode classifies create/update actions without writing', async () => {
  const { report } = await runImportWorkflow({
    studentsFile: files.students,
    teachersFile: files.teachers,
    coursesFile: files.courses,
    enrollmentsFile: files.enrollments,
    scheduleFile: files.schedule,
    apply: false,
    sourceLabel: 'pilot-import-test-preview',
    reportStem: path.join(tempDir, 'preview-report')
  });

  assert.equal(report.summary.students.create, 1);
  assert.equal(report.summary.students.update, 1);
  assert.equal(report.summary.teachers.create, 1);
  assert.equal(report.summary.teachers.update, 1);
  assert.equal(report.summary.courses.create, 1);
  assert.equal(report.summary.courses.update, 1);
  assert.equal(report.summary.enrollments.create, 1);
  assert.equal(report.summary.enrollments.update, 1);
  assert.equal(report.summary.schedule.create, 1);
  assert.equal(report.summary.schedule.update, 1);

  const importedStudent = await db.get(
    'SELECT id FROM users WHERE email = ?',
    ['nuraiym.satybaldieva@alatoo.edu.kg']
  );
  assert.equal(importedStudent, undefined);
});

test('apply mode creates and updates pilot records', async () => {
  await runImportWorkflow({
    studentsFile: files.students,
    teachersFile: files.teachers,
    coursesFile: files.courses,
    enrollmentsFile: files.enrollments,
    scheduleFile: files.schedule,
    apply: true,
    sourceLabel: 'pilot-import-test-apply',
    reportStem: path.join(tempDir, 'apply-report')
  });

  const newStudent = await db.get(
    'SELECT * FROM users WHERE email = ?',
    ['nuraiym.satybaldieva@alatoo.edu.kg']
  );
  assert.ok(newStudent);
  assert.equal(newStudent.role, 'student');

  const newTeacher = await db.get(
    'SELECT * FROM users WHERE email = ?',
    ['adilbek.temirov@alatoo.edu.kg']
  );
  assert.ok(newTeacher);
  assert.equal(newTeacher.role, 'teacher');

  const updatedStudent = await db.get(
    'SELECT * FROM users WHERE student_id = ?',
    ['240141052']
  );
  assert.equal(updatedStudent.year_of_study, 4);
  assert.equal(updatedStudent.phone, '+996700399001');

  const updatedCourse = await db.get(
    'SELECT * FROM courses WHERE code = ?',
    ['CYB201']
  );
  assert.equal(updatedCourse.name, 'Cybersecurity Fundamentals Extended');
  assert.equal(updatedCourse.credits, 5);

  const newCourse = await db.get(
    'SELECT * FROM courses WHERE code = ?',
    ['NET330']
  );
  assert.ok(newCourse);
  assert.equal(newCourse.teacher_id, newTeacher.id);

  const updatedEnrollment = await db.get(
    'SELECT * FROM course_enrollments WHERE student_id = ? AND course_id = ?',
    [updatedStudent.id, updatedCourse.id]
  );
  assert.ok(updatedEnrollment);
  assert.equal(getDatePrefix(updatedEnrollment.enrolled_at), '2026-02-01');

  const createdEnrollment = await db.get(
    'SELECT * FROM course_enrollments WHERE student_id = ? AND course_id = ?',
    [newStudent.id, newCourse.id]
  );
  assert.ok(createdEnrollment);
  assert.equal(getDatePrefix(createdEnrollment.enrolled_at), '2026-02-02');

  const updatedSchedule = await db.get(
    `SELECT * FROM schedule
     WHERE day = ? AND time_slot = ? AND group_name = ? AND course_id = ?`,
    ['Monday', '08:00-08:40', 'CYB-23', updatedCourse.id]
  );
  assert.ok(updatedSchedule);
  assert.equal(updatedSchedule.room, 'A-305');
  assert.equal(updatedSchedule.subject, 'Cybersecurity Fundamentals Extended');

  const individualSchedule = await db.get(
    `SELECT * FROM schedule
     WHERE day = ? AND time_slot = ? AND student_user_id = ? AND course_id = ?`,
    ['Friday', '15:30-16:10', newStudent.id, newCourse.id]
  );
  assert.ok(individualSchedule);
  assert.equal(individualSchedule.group_name, 'CYB-24');
  assert.equal(individualSchedule.audience_type, 'individual');
});

test('xlsx imports are rejected for security hardening', async () => {
  writeFile(files.studentsXlsx, 'not-a-real-workbook');

  await assert.rejects(
    () => runImportWorkflow({
      studentsFile: files.studentsXlsx,
      apply: false,
      sourceLabel: 'pilot-import-xlsx-disabled',
      reportStem: path.join(tempDir, 'xlsx-disabled-report')
    }),
    /Excel imports are disabled for security hardening/i
  );
});
