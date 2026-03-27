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
  courses: path.join(tempDir, 'courses.csv')
};

const writeFile = (targetPath, contents) => {
  fs.writeFileSync(targetPath, contents.trim());
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
});
