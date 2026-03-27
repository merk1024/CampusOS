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

test('admin can access user directory', async () => {
  const adminSession = await login('admin@alatoo.edu.kg', process.env.SEED_ADMIN_PASSWORD);
  const { response, body } = await request('/api/users', {
    headers: authHeaders(adminSession.token)
  });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.users));
  assert.ok(body.users.length >= 10);
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
