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
});

test('GET /api returns CampusOS resource summary', async () => {
  const { response, body } = await request('/api');

  assert.equal(response.status, 200);
  assert.equal(body.name, 'CampusOS API');
  assert.equal(body.status, 'online');
  assert.ok(Array.isArray(body.resources));
  assert.ok(body.resources.includes('/api/courses'));
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

test('student can read own attendance history', async () => {
  const studentSession = await login('240141052', process.env.SEED_STUDENT_PASSWORD);
  const { response, body } = await request('/api/attendance/student/240141052', {
    headers: authHeaders(studentSession.token)
  });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.attendance));
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

  const studentGrades = await request('/api/grades/student/240141052', {
    headers: authHeaders(studentSession.token)
  });

  assert.equal(studentGrades.response.status, 200);
  assert.ok(studentGrades.body.grades.some((grade) => grade.exam_id === examId && grade.subject === uniqueSubject));
});
