const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'campusos-backend-tests-'));
const sqliteDbPath = path.join(tempDir, 'campusos-test.db');

process.env.NODE_ENV = 'test';
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_DB_PATH = sqliteDbPath;
process.env.JWT_SECRET = 'campusos-test-jwt-secret';
process.env.SUPERADMIN_BOOTSTRAP_PASSWORD = 'SuperAdmin123!';
process.env.SEED_ADMIN_PASSWORD = 'Admin123!';
process.env.SEED_TEACHER_PASSWORD = 'Teacher123!';
process.env.SEED_STUDENT_PASSWORD = 'Student123!';

const seed = require('../seeds/seed');
const { startServer } = require('../server');
const { SUPERADMIN_EMAIL } = require('../utils/access');
const db = require('../config/database');
const { runQueuedJobs } = require('../utils/platformOps');

let server;
let baseUrl;

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

const closeServer = (activeServer) => (
  new Promise((resolve, reject) => {
    activeServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  })
);

const request = async (route, options = {}) => {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      ...jsonHeaders,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return { response, body };
};

const login = async (loginValue, password) => {
  const { response, body } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      login: loginValue,
      password
    })
  });

  assert.equal(response.status, 200, `Expected login to succeed for ${loginValue}`);
  assert.ok(body.token, `Expected token for ${loginValue}`);
  return body;
};

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`
});

test.before(async () => {
  await seed();
  server = await startServer(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) {
    await closeServer(server);
  }

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'EPERM') {
      throw error;
    }
  }
});

test('GET / returns CampusOS service metadata', async () => {
  const { response, body } = await request('/');

  assert.equal(response.status, 200);
  assert.equal(body.message, 'CampusOS API');
  assert.equal(body.api, '/api');
  assert.equal(body.health, '/health');
  assert.equal(body.readiness, '/ready');
});

test('GET /api returns CampusOS resource summary', async () => {
  const { response, body } = await request('/api');

  assert.equal(response.status, 200);
  assert.equal(body.name, 'CampusOS API');
  assert.equal(body.status, 'online');
  assert.equal(body.readiness, '/ready');
  assert.ok(Array.isArray(body.resources));
  assert.ok(body.resources.includes('/api/courses'));
});

test('GET /health returns request tracing metadata', async () => {
  const customRequestId = `health-${Date.now()}`;
  const { response, body } = await request('/health', {
    headers: {
      'X-Request-Id': customRequestId
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-request-id'), customRequestId);
  assert.equal(body.requestId, customRequestId);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'CampusOS API');
  assert.equal(body.database.client, 'sqlite');
  assert.equal(body.database.status, 'configured');
  assert.equal(typeof body.uptimeSeconds, 'number');
});

test('database migrations expose the current schema version and platform tables', async () => {
  assert.equal(db.schemaVersion, '2026-04-02-005-platform-ops-tables');

  const migrationRow = await db.get(
    'SELECT version FROM schema_migrations WHERE version = ?',
    ['2026-04-02-005-platform-ops-tables']
  );
  assert.ok(migrationRow);

  const systemAuditTable = await db.get(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table' AND name = ?`,
    ['system_audit_log']
  );
  const notificationInboxTable = await db.get(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table' AND name = ?`,
    ['notification_inbox']
  );
  const jobQueueTable = await db.get(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table' AND name = ?`,
    ['job_queue']
  );

  assert.ok(systemAuditTable);
  assert.ok(notificationInboxTable);
  assert.ok(jobQueueTable);
});

test('login sets an auth cookie for browser sessions', async () => {
  const { response, body } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      login: 'admin@alatoo.edu.kg',
      password: process.env.SEED_ADMIN_PASSWORD,
      rememberMe: true
    })
  });

  assert.equal(response.status, 200, JSON.stringify(body));
  const cookieHeader = response.headers.get('set-cookie');
  assert.ok(cookieHeader?.includes('campusos_session='));
  assert.ok(cookieHeader?.toLowerCase().includes('httponly'));
});

test('GET /ready verifies database readiness', async () => {
  const { response, body } = await request('/ready');

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.status, 'ready');
  assert.equal(body.database.client, 'sqlite');
  assert.equal(body.database.status, 'ready');
  assert.ok(body.requestId);
});

test('student cannot access admin-only user directory', async () => {
  const studentSession = await login('240141052', process.env.SEED_STUDENT_PASSWORD);
  const { response, body } = await request('/api/users', {
    headers: authHeaders(studentSession.token)
  });

  assert.equal(response.status, 403);
  assert.equal(body.error, 'Access denied. Admin only.');
});

test('teacher cannot access admin-only user directory', async () => {
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const { response, body } = await request('/api/users', {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(response.status, 403);
  assert.equal(body.error, 'Access denied. Admin only.');
});

test('admin can access user directory', async () => {
  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const { response, body } = await request('/api/users', {
    headers: authHeaders(adminSession.token)
  });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.users));
  assert.ok(body.users.length >= 10);
});

test('superadmin can access admin-only user directory', async () => {
  const superadminSession = await login(SUPERADMIN_EMAIL, process.env.SUPERADMIN_BOOTSTRAP_PASSWORD);
  const { response, body } = await request('/api/users', {
    headers: authHeaders(superadminSession.token)
  });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.users));
  assert.ok(body.users.some((user) => user.email === SUPERADMIN_EMAIL));
});

test('admin can create another admin without student-only fields', async () => {
  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const uniqueEmail = `admin-${Date.now()}@campusos.test`;

  const { response, body } = await request('/api/users', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      name: 'Operations Admin',
      email: uniqueEmail,
      password: 'TempAdmin123!',
      role: 'admin',
      student_id: '',
      group_name: '',
      subgroup_name: '',
      phone: '',
      date_of_birth: '',
      faculty: '',
      major: '',
      year_of_study: '',
      address: '',
      emergency_contact: ''
    })
  });

  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.user.email, uniqueEmail);
  assert.equal(body.user.role, 'admin');
  assert.equal(body.user.student_id, null);
});

test('admin can preview bulk user creation with create, skip, and error rows', async () => {
  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const uniqueSuffix = Date.now();
  const csvText = [
    'name,email,role,student_id,group_name',
    `Bulk Student ${uniqueSuffix},bulk-student-${uniqueSuffix}@campusos.test,student,24014${uniqueSuffix},CYB-23`,
    'Existing Teacher,teacher@alatoo.edu.kg,teacher,,',
    `Broken Role ${uniqueSuffix},broken-role-${uniqueSuffix}@campusos.test,manager,,`
  ].join('\n');

  const { response, body } = await request('/api/users/bulk/preview', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({ csvText })
  });

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.summary.total, 3);
  assert.equal(body.summary.create, 1);
  assert.equal(body.summary.skip, 1);
  assert.equal(body.summary.error, 1);
});

test('admin can apply bulk user creation and receive generated passwords', async () => {
  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const uniqueSuffix = Date.now();
  const studentEmail = `bulk-student-${uniqueSuffix}@campusos.test`;
  const teacherEmail = `bulk-teacher-${uniqueSuffix}@campusos.test`;
  const csvText = [
    'name,email,role,student_id,group_name,faculty,major',
    `Bulk Student ${uniqueSuffix},${studentEmail},student,24${uniqueSuffix},CYB-23,School of Engineering,Cybersecurity`,
    `Bulk Teacher ${uniqueSuffix},${teacherEmail},teacher,,,School of Engineering,Cybersecurity`
  ].join('\n');

  const { response, body } = await request('/api/users/bulk/apply', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({ csvText })
  });

  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.summary.created, 2);
  assert.equal(body.credentials.length, 2);
  assert.ok(body.credentials.every((credential) => credential.password));

  const directory = await request('/api/users', {
    headers: authHeaders(adminSession.token)
  });

  assert.equal(directory.response.status, 200);
  assert.ok(directory.body.users.some((user) => user.email === studentEmail));
  assert.ok(directory.body.users.some((user) => user.email === teacherEmail));
});

test('admin can disable and restore a user account', async () => {
  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const uniqueEmail = `status-teacher-${Date.now()}@campusos.test`;
  const teacherPassword = 'StatusTeacher123!';

  const createdAccount = await request('/api/users', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      name: 'Status Managed Teacher',
      email: uniqueEmail,
      password: teacherPassword,
      role: 'teacher'
    })
  });

  assert.equal(createdAccount.response.status, 201, JSON.stringify(createdAccount.body));
  const createdUserId = createdAccount.body.user.id;

  const disabledResult = await request(`/api/users/${createdUserId}/status`, {
    method: 'PATCH',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({ is_active: false })
  });

  assert.equal(disabledResult.response.status, 200, JSON.stringify(disabledResult.body));
  assert.equal(disabledResult.body.user.is_active, 0);

  const blockedLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      login: uniqueEmail,
      password: teacherPassword
    })
  });

  assert.equal(blockedLogin.response.status, 403);
  assert.equal(blockedLogin.body.error, 'Account is disabled');

  const restoredResult = await request(`/api/users/${createdUserId}/status`, {
    method: 'PATCH',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({ is_active: true })
  });

  assert.equal(restoredResult.response.status, 200, JSON.stringify(restoredResult.body));

  const restoredLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      login: uniqueEmail,
      password: teacherPassword
    })
  });

  assert.equal(restoredLogin.response.status, 200, JSON.stringify(restoredLogin.body));
});

test('teacher can open attendance management sessions but student cannot', async () => {
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const teacherResult = await request('/api/attendance/management/sessions?date=2026-03-27', {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(teacherResult.response.status, 200);
  assert.ok(Array.isArray(teacherResult.body.sessions));
  assert.ok(teacherResult.body.sessions.length >= 1);

  const studentSession = await login('240141052', process.env.SEED_STUDENT_PASSWORD);
  const studentResult = await request('/api/attendance/management/sessions?date=2026-03-27', {
    headers: authHeaders(studentSession.token)
  });

  assert.equal(studentResult.response.status, 403);
  assert.equal(studentResult.body.error, 'Access denied. Teachers and admins only.');
});

test('admin can create course while student is blocked from the same route', async () => {
  const studentSession = await login('240141052', process.env.SEED_STUDENT_PASSWORD);
  const studentAttempt = await request('/api/courses', {
    method: 'POST',
    headers: authHeaders(studentSession.token),
    body: JSON.stringify({
      code: 'BLOCKED101',
      name: 'Blocked Student Course',
      description: 'Should not be created',
      credits: 3,
      semester: 'Spring 2026'
    })
  });

  assert.equal(studentAttempt.response.status, 403);

  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const uniqueCode = `QA${Date.now()}`;

  const adminAttempt = await request('/api/courses', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      code: uniqueCode,
      name: 'QA Automation Fundamentals',
      description: 'Smoke-tested course creation route',
      credits: 2,
      semester: 'Spring 2026',
      teacher_id: teacherSession.user.id
    })
  });

  assert.equal(adminAttempt.response.status, 201);
  assert.equal(adminAttempt.body.course.code, uniqueCode);
  assert.equal(adminAttempt.body.course.teacher_id, teacherSession.user.id);
});

test('admin can bulk assign a teacher to multiple courses', async () => {
  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const uniqueSuffix = Date.now();

  const firstCourse = await request('/api/courses', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      code: `BTA${uniqueSuffix}`,
      name: 'Bulk Assignment Foundations',
      description: 'Bulk teacher assignment regression test',
      credits: 3,
      semester: 'Spring 2026'
    })
  });

  const secondCourse = await request('/api/courses', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      code: `BTB${uniqueSuffix}`,
      name: 'Bulk Assignment Lab',
      description: 'Bulk teacher assignment regression test',
      credits: 2,
      semester: 'Spring 2026'
    })
  });

  assert.equal(firstCourse.response.status, 201, JSON.stringify(firstCourse.body));
  assert.equal(secondCourse.response.status, 201, JSON.stringify(secondCourse.body));

  const assignmentResult = await request('/api/courses/bulk/teacher-assignment', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      teacher_id: teacherSession.user.id,
      course_ids: [firstCourse.body.course.id, secondCourse.body.course.id]
    })
  });

  assert.equal(assignmentResult.response.status, 200, JSON.stringify(assignmentResult.body));
  assert.equal(assignmentResult.body.summary.updated_courses, 2);
  assert.ok(assignmentResult.body.courses.every((course) => course.teacher_id === teacherSession.user.id));
});

test('admin can bulk enroll students and export course operations data', async () => {
  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const uniqueCode = `OPS${Date.now()}`;

  const directory = await request('/api/users', {
    headers: authHeaders(adminSession.token)
  });

  assert.equal(directory.response.status, 200, JSON.stringify(directory.body));
  const students = directory.body.users.filter((user) => user.role === 'student').slice(0, 2);
  assert.equal(students.length, 2, 'Expected at least two seeded students for enrollment regression');

  const createdCourse = await request('/api/courses', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      code: uniqueCode,
      name: 'Operations Reporting',
      description: 'Course used for bulk enrollment and reporting regression tests',
      credits: 3,
      semester: 'Spring 2026',
      teacher_id: teacherSession.user.id
    })
  });

  assert.equal(createdCourse.response.status, 201, JSON.stringify(createdCourse.body));
  const courseId = createdCourse.body.course.id;

  const enrollmentResult = await request('/api/courses/bulk/enrollments', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      course_ids: [courseId],
      student_identifiers: [students[0].student_id, students[1].email]
    })
  });

  assert.equal(enrollmentResult.response.status, 200, JSON.stringify(enrollmentResult.body));
  assert.equal(enrollmentResult.body.summary.created, 2);
  assert.equal(enrollmentResult.body.summary.matched_students, 2);

  const reportResult = await request('/api/courses/reports/overview', {
    headers: authHeaders(adminSession.token)
  });

  assert.equal(reportResult.response.status, 200, JSON.stringify(reportResult.body));
  const reportRow = reportResult.body.rows.find((row) => row.code === uniqueCode);
  assert.ok(reportRow, 'Expected new course to appear in operations overview');
  assert.equal(reportRow.enrollment_count, 2);

  const teacherRoster = await request(`/api/courses/${courseId}/roster`, {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(teacherRoster.response.status, 200, JSON.stringify(teacherRoster.body));
  assert.equal(teacherRoster.body.students.length, 2);
  assert.ok(teacherRoster.body.students.some((student) => student.student_id === students[0].student_id));
  assert.ok(teacherRoster.body.students.some((student) => student.email === students[1].email));
});

test('admin can analyze and apply subject selection integration snapshots', async () => {
  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const uniqueCode = `INT${Date.now()}`;
  const coursesCsvText = [
    'course_code,course_name,semester',
    `${uniqueCode},Integrated Subject Selection,Spring 2026`
  ].join('\n');
  const enrollmentsCsvText = [
    'student_id,course_code,enrolled_at',
    `240141052,${uniqueCode},2026-04-02`
  ].join('\n');

  const analysis = await request('/api/integrations/subject-selection/analyze', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      sourceName: 'My Alatoo Test Export',
      coursesCsvText,
      enrollmentsCsvText
    })
  });

  assert.equal(analysis.response.status, 200, JSON.stringify(analysis.body));
  assert.equal(analysis.body.source.key, 'subject-selection');
  assert.equal(analysis.body.overview.externalCourses, 1);
  assert.equal(analysis.body.overview.externalSelections, 1);
  assert.ok(analysis.body.findings.some((finding) => finding.status === 'only_in_export'));

  const applied = await request('/api/integrations/subject-selection/override', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      sourceName: 'My Alatoo Test Export',
      coursesCsvText,
      enrollmentsCsvText
    })
  });

  assert.equal(applied.response.status, 201, JSON.stringify(applied.body));
  assert.equal(applied.body.summary.courses.create, 1);
  assert.equal(applied.body.summary.enrollments.create, 1);

  const courseOverview = await request('/api/courses/reports/overview', {
    headers: authHeaders(adminSession.token)
  });

  assert.equal(courseOverview.response.status, 200, JSON.stringify(courseOverview.body));
  const integratedCourse = courseOverview.body.rows.find((row) => row.code === uniqueCode);
  assert.ok(integratedCourse);
  assert.equal(integratedCourse.enrollment_count, 1);
});

test('admin can analyze academic record integration snapshots in read-only mode', async () => {
  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const uniqueSubject = `Integration Audit ${Date.now()}`;

  const examResult = await request('/api/exams', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      group_name: 'CYB-23',
      subject: uniqueSubject,
      exam_date: '2026-04-22',
      exam_time: '11:00',
      room: 'A-301',
      type: 'Midterm',
      semester: 'Spring 2026',
      students: ['240141052']
    })
  });

  assert.equal(examResult.response.status, 201, JSON.stringify(examResult.body));

  const savedGrade = await request('/api/grades', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      examId: examResult.body.exam.id,
      studentId: '240141052',
      grade: 92,
      comments: 'Integration check'
    })
  });

  assert.equal(savedGrade.response.status, 200, JSON.stringify(savedGrade.body));

  const sessionsResult = await request('/api/attendance/management/sessions?date=2026-03-27', {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(sessionsResult.response.status, 200, JSON.stringify(sessionsResult.body));
  const targetSession = sessionsResult.body.sessions.find((session) => session.course_code) || sessionsResult.body.sessions[0];
  assert.ok(targetSession, 'Expected seeded attendance session to be available');

  const sessionDetail = await request(`/api/attendance/management/session/${targetSession.id}?date=2026-03-27`, {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(sessionDetail.response.status, 200, JSON.stringify(sessionDetail.body));
  const targetStudent = sessionDetail.body.students[0];
  assert.ok(targetStudent, 'Expected a student in the selected session roster');

  const saveAttendance = await request('/api/attendance/bulk', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      scheduleId: targetSession.id,
      date: '2026-03-27',
      records: [
        {
          studentId: targetStudent.student_id,
          status: 'present'
        }
      ]
    })
  });

  assert.equal(saveAttendance.response.status, 200, JSON.stringify(saveAttendance.body));

  const gradesCsvText = [
    'student_id,subject,assessment_type,grade',
    `240141052,${uniqueSubject},Midterm,95`
  ].join('\n');
  const attendanceCsvText = [
    'student_id,course_code,date,status',
    `${targetStudent.student_id},${targetSession.course_code || targetSession.subject},2026-03-27,absent`
  ].join('\n');

  const analysis = await request('/api/integrations/academic-records/analyze', {
    method: 'POST',
    headers: authHeaders(adminSession.token),
    body: JSON.stringify({
      sourceName: 'OCS Test Export',
      gradesCsvText,
      attendanceCsvText
    })
  });

  assert.equal(analysis.response.status, 200, JSON.stringify(analysis.body));
  assert.equal(analysis.body.source.key, 'academic-records');
  assert.equal(analysis.body.overview.externalGrades, 1);
  assert.equal(analysis.body.overview.externalAttendance, 1);
  assert.ok(analysis.body.findings.some((finding) => finding.status === 'mismatch'));
});

test('student can read own attendance history', async () => {
  const studentSession = await login('240141052', process.env.SEED_STUDENT_PASSWORD);
  const { response, body } = await request('/api/attendance/student/240141052', {
    headers: authHeaders(studentSession.token)
  });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.attendance));
});

test('teacher can read attendance analytics for managed classes', async () => {
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);

  const sessionsResult = await request('/api/attendance/management/sessions?date=2026-03-27', {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(sessionsResult.response.status, 200, JSON.stringify(sessionsResult.body));
  const targetSession = sessionsResult.body.sessions.find((session) => session.course_code) || sessionsResult.body.sessions[0];
  assert.ok(targetSession, 'Expected a seeded attendance session for analytics');

  const sessionDetail = await request(`/api/attendance/management/session/${targetSession.id}?date=2026-03-27`, {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(sessionDetail.response.status, 200, JSON.stringify(sessionDetail.body));
  const rosterSlice = sessionDetail.body.students.slice(0, 3);
  assert.ok(rosterSlice.length >= 1, 'Expected at least one student to mark for analytics');

  const statusSequence = ['present', 'late', 'absent'];
  const records = rosterSlice.map((student, index) => ({
    studentId: student.student_id,
    status: statusSequence[index] || 'present'
  }));

  const attendanceSave = await request('/api/attendance/bulk', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      scheduleId: targetSession.id,
      date: '2026-03-27',
      records
    })
  });

  assert.equal(attendanceSave.response.status, 200, JSON.stringify(attendanceSave.body));

  const analytics = await request('/api/attendance/analytics?from=2026-03-01&to=2026-03-31', {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(analytics.response.status, 200, JSON.stringify(analytics.body));
  assert.ok(analytics.body.summary.totalRecords >= records.length);
  assert.ok(analytics.body.summary.studentsTracked >= 1);
  assert.ok(Array.isArray(analytics.body.trend));
  assert.ok(analytics.body.trend.some((entry) => entry.date === '2026-03-27'));
  assert.ok(Array.isArray(analytics.body.courseBreakdown));
  assert.ok(analytics.body.courseBreakdown.length >= 1);
  assert.ok(Array.isArray(analytics.body.groupBreakdown));
  assert.ok(Array.isArray(analytics.body.riskStudents));
});

test('teacher and student can read academic risk flags for their scope', async () => {
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const studentSession = await login('240141052', process.env.SEED_STUDENT_PASSWORD);

  const sessionsResult = await request('/api/attendance/management/sessions?date=2026-03-27', {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(sessionsResult.response.status, 200, JSON.stringify(sessionsResult.body));
  const targetSession = sessionsResult.body.sessions.find((session) => session.course_code) || sessionsResult.body.sessions[0];
  assert.ok(targetSession, 'Expected a managed session for the risk flag test');

  const absentDates = ['2026-03-24', '2026-03-26', '2026-03-27'];
  for (const date of absentDates) {
    const markAttendance = await request('/api/attendance', {
      method: 'POST',
      headers: authHeaders(teacherSession.token),
      body: JSON.stringify({
        scheduleId: targetSession.id,
        studentId: '240141052',
        date,
        status: 'absent'
      })
    });

    assert.equal(markAttendance.response.status, 200, JSON.stringify(markAttendance.body));
  }

  const uniqueSubject = `Risk Flags ${Date.now()}`;
  const createExamResult = await request('/api/exams', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      group_name: 'CYB-23',
      subject: uniqueSubject,
      exam_date: '2026-04-16',
      exam_time: '12:00',
      room: 'A-204',
      type: 'Quiz',
      semester: 'Spring 2026',
      students: ['240141052']
    })
  });

  assert.equal(createExamResult.response.status, 201, JSON.stringify(createExamResult.body));

  const failingGrade = await request('/api/grades', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      examId: createExamResult.body.exam.id,
      studentId: '240141052',
      grade: 48,
      comments: 'Risk flag regression test'
    })
  });

  assert.equal(failingGrade.response.status, 200, JSON.stringify(failingGrade.body));

  const teacherFlags = await request('/api/ops/risk-flags?from=2026-03-01&to=2026-04-30', {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(teacherFlags.response.status, 200, JSON.stringify(teacherFlags.body));
  assert.ok(teacherFlags.body.summary.flaggedStudents >= 1);
  assert.ok(teacherFlags.body.flags.some((flag) => flag.studentId === '240141052'));

  const studentFlags = await request('/api/ops/risk-flags?from=2026-03-01&to=2026-04-30', {
    headers: authHeaders(studentSession.token)
  });

  assert.equal(studentFlags.response.status, 200, JSON.stringify(studentFlags.body));
  assert.equal(studentFlags.body.snapshot.studentId, '240141052');
  assert.notEqual(studentFlags.body.snapshot.severity, 'ok');
  assert.ok(studentFlags.body.snapshot.reasons.length >= 1);
});

test('teacher and student can read performance dashboards for their scope', async () => {
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const studentSession = await login('240141052', process.env.SEED_STUDENT_PASSWORD);

  const sessionsResult = await request('/api/attendance/management/sessions?date=2026-03-28', {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(sessionsResult.response.status, 200, JSON.stringify(sessionsResult.body));
  const targetSession = sessionsResult.body.sessions.find((session) => session.course_code) || sessionsResult.body.sessions[0];
  assert.ok(targetSession, 'Expected a session for the performance dashboard test');

  const sessionDetail = await request(`/api/attendance/management/session/${targetSession.id}?date=2026-03-28`, {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(sessionDetail.response.status, 200, JSON.stringify(sessionDetail.body));
  const rosterSlice = sessionDetail.body.students.slice(0, 2);
  assert.ok(rosterSlice.length >= 1, 'Expected roster data for the performance dashboard test');

  const attendanceSave = await request('/api/attendance/bulk', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      scheduleId: targetSession.id,
      date: '2026-03-28',
      records: rosterSlice.map((student, index) => ({
        studentId: student.student_id,
        status: index === 0 ? 'present' : 'late'
      }))
    })
  });

  assert.equal(attendanceSave.response.status, 200, JSON.stringify(attendanceSave.body));

  const uniqueSubject = `Performance Dash ${Date.now()}`;
  const createdExam = await request('/api/exams', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      group_name: 'CYB-23',
      subject: uniqueSubject,
      exam_date: '2026-04-18',
      exam_time: '09:30',
      room: 'B-101',
      type: 'Quiz',
      semester: 'Spring 2026',
      students: rosterSlice.map((student) => student.student_id)
    })
  });

  assert.equal(createdExam.response.status, 201, JSON.stringify(createdExam.body));

  const gradeValues = [96, 78];
  for (const [index, student] of rosterSlice.entries()) {
    const gradeSave = await request('/api/grades', {
      method: 'POST',
      headers: authHeaders(teacherSession.token),
      body: JSON.stringify({
        examId: createdExam.body.exam.id,
        studentId: student.student_id,
        grade: gradeValues[index] || 84,
        comments: 'Performance dashboard regression test'
      })
    });

    assert.equal(gradeSave.response.status, 200, JSON.stringify(gradeSave.body));
  }

  const teacherDashboard = await request('/api/ops/performance-dashboard?from=2026-03-01&to=2026-04-30', {
    headers: authHeaders(teacherSession.token)
  });

  assert.equal(teacherDashboard.response.status, 200, JSON.stringify(teacherDashboard.body));
  assert.ok(teacherDashboard.body.summary.studentsTracked >= 1);
  assert.ok(Array.isArray(teacherDashboard.body.groupPerformance));
  assert.ok(Array.isArray(teacherDashboard.body.topStudents));
  assert.ok(teacherDashboard.body.groupPerformance.length >= 1);

  const studentDashboard = await request('/api/ops/performance-dashboard?from=2026-03-01&to=2026-04-30', {
    headers: authHeaders(studentSession.token)
  });

  assert.equal(studentDashboard.response.status, 200, JSON.stringify(studentDashboard.body));
  assert.equal(studentDashboard.body.studentSnapshot.studentId, '240141052');
  assert.ok(studentDashboard.body.studentSnapshot.attendanceRate >= 0);
});

test('teacher can create an exam and publish a grade while student cannot submit grades', async () => {
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const studentSession = await login('240141052', process.env.SEED_STUDENT_PASSWORD);
  const uniqueSubject = `Regression Testing ${Date.now()}`;

  const createExamResult = await request('/api/exams', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      group_name: 'CYB-23',
      subject: uniqueSubject,
      exam_date: '2026-04-15',
      exam_time: '10:00',
      room: 'A-201',
      type: 'Midterm',
      semester: 'Spring 2026',
      students: ['240141052']
    })
  });

  assert.equal(createExamResult.response.status, 201, JSON.stringify(createExamResult.body));
  const examId = createExamResult.body.exam.id;
  assert.ok(examId);

  const examAudit = await db.get(
    `SELECT *
     FROM system_audit_log
     WHERE entity_type = ?
       AND entity_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    ['exam', String(examId)]
  );

  assert.ok(examAudit);
  assert.equal(examAudit.action, 'create');

  const blockedStudentAttempt = await request('/api/grades', {
    method: 'POST',
    headers: authHeaders(studentSession.token),
    body: JSON.stringify({
      examId,
      studentId: '240141052',
      grade: 92,
      comments: 'Blocked student attempt'
    })
  });

  assert.equal(blockedStudentAttempt.response.status, 403);
  assert.equal(blockedStudentAttempt.body.error, 'Access denied. Teachers and admins only.');

  const teacherGradeAttempt = await request('/api/grades', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      examId,
      studentId: '240141052',
      grade: 92,
      comments: 'Published by teacher'
    })
  });

  assert.equal(teacherGradeAttempt.response.status, 200, JSON.stringify(teacherGradeAttempt.body));
  assert.equal(teacherGradeAttempt.body.grade.grade, 92);

  const gradeAudit = await db.get(
    `SELECT *
     FROM system_audit_log
     WHERE entity_type = ?
       AND entity_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    ['grade', String(teacherGradeAttempt.body.grade.id)]
  );

  assert.ok(gradeAudit);
  assert.equal(gradeAudit.action, 'create');

  const studentGrades = await request('/api/grades/student/240141052', {
    headers: authHeaders(studentSession.token)
  });

  assert.equal(studentGrades.response.status, 200);
  assert.ok(studentGrades.body.grades.some((grade) => grade.exam_id === examId && grade.subject === uniqueSubject));
});

test('announcement creation writes system audit entries and queued notifications', async () => {
  const teacherSession = await login('teacher@alatoo.edu.kg', process.env.SEED_TEACHER_PASSWORD);
  const uniqueTitle = `CampusOS Notice ${Date.now()}`;

  const createdAnnouncement = await request('/api/announcements', {
    method: 'POST',
    headers: authHeaders(teacherSession.token),
    body: JSON.stringify({
      title: uniqueTitle,
      content: 'Regression test for background notification delivery.',
      type: 'important',
      isPinned: true
    })
  });

  assert.equal(createdAnnouncement.response.status, 201, JSON.stringify(createdAnnouncement.body));

  const auditEntry = await db.get(
    `SELECT *
     FROM system_audit_log
     WHERE entity_type = ?
       AND entity_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    ['announcement', String(createdAnnouncement.body.announcement.id)]
  );

  assert.ok(auditEntry);
  assert.equal(auditEntry.action, 'create');

  const queuedNotification = await db.get(
    `SELECT *
     FROM job_queue
     WHERE job_type = ?
       AND status = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    ['notification.broadcast', 'pending']
  );

  assert.ok(queuedNotification);

  const workerResult = await runQueuedJobs({
    workerName: 'test-worker',
    limit: 10
  });

  assert.ok(workerResult.processedCount >= 1);

  const deliveredNotification = await db.get(
    `SELECT *
     FROM notification_inbox
     WHERE source_type = ?
       AND source_id = ?
     LIMIT 1`,
    ['announcement', String(createdAnnouncement.body.announcement.id)]
  );

  assert.ok(deliveredNotification);
});
