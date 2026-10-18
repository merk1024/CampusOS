import { test, expect } from '@playwright/test';

const password = 'CampusOS-E2E-Only-2026!';
async function signIn(page, login, secret = password) {
  await page.goto('/');
  await page.locator('#campusos-login').fill(login);
  await page.locator('#campusos-password').fill(secret);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
}

for (const [role, login] of [['student', '240141052'], ['teacher', 'teacher@alatoo.edu.kg'], ['admin', 'admin@alatoo.edu.kg']]) {
  test(`${role}: real login, navigation and server authorization`, async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await signIn(page, login);
    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(navigation.getByRole('button', { name: /Open.*User/i })).toHaveCount(role === 'admin' ? 1 : 0);
    const directory = await page.request.get('http://127.0.0.1:5117/api/users');
    expect(directory.status()).toBe(role === 'admin' ? 200 : 403);
    const audit = await page.request.get('http://127.0.0.1:5117/api/ops/security-audit');
    expect(audit.status()).toBe(role === 'admin' ? 200 : 403);
    if (role !== 'admin') {
      const reset = await page.request.post('http://127.0.0.1:5117/api/auth/mfa/reset', {
        headers: { Origin: 'http://127.0.0.1:4173' }, data: { targetId: 1, currentPassword: password, code: '123456' }
      });
      expect(reset.status()).toBe(403);
    }
    await expect(navigation.getByRole('button', { name: 'Open Security Center', exact: true })).toHaveCount(role === 'admin' ? 1 : 0);
    if (role === 'admin') {
      await navigation.getByRole('button', { name: 'Open Security Center', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Security Center', exact: true })).toBeVisible();
      await expect(page.getByRole('table')).toBeVisible();
      await page.getByLabel('Action', { exact: true }).fill('login');
      await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
      await expect(page.getByRole('table')).toBeVisible();
    }
    await navigation.getByRole('button', { name: 'Open Exams', exact: true }).click();
    await expect(page.locator('main')).toContainText(/exam/i);
    await expect(page.locator('main')).not.toContainText('Server error');
    expect(runtimeErrors).toEqual([]);
  });
}

test('administrator sees an alert after repeated real access denials', async ({ page, request }) => {
  const login = await request.post('http://127.0.0.1:5117/api/auth/login', {
    data: { login: 'teacher@alatoo.edu.kg', password }
  });
  expect(login.status()).toBe(200);
  const { token } = await login.json();
  for (let i = 0; i < 10; i++) {
    const denied = await request.get('http://127.0.0.1:5117/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(denied.status()).toBe(403);
  }
  await signIn(page, 'admin@alatoo.edu.kg');
  await page.getByRole('button', { name: 'Open Security Center', exact: true }).click();
  const alerts = page.getByRole('region', { name: 'Security alerts', exact: true });
  await expect(alerts).toContainText('Repeated access denials');
  await expect(alerts).toContainText('teacher@alatoo.edu.kg');
  await alerts.getByRole('button', { name: 'Refresh alerts', exact: true }).click();
  await expect(alerts).toContainText('Repeated access denials');
  expect((await request.get('http://127.0.0.1:5117/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  })).status()).toBe(200);
});

test('student cookie cannot forge academic profile fields', async ({ page }) => {
  await signIn(page, '240141052');
  const before = await (await page.request.get('http://127.0.0.1:5117/api/users/profile/me')).json();
  const denied = await page.request.put('http://127.0.0.1:5117/api/users/profile/me', {
    headers: { Origin: 'http://127.0.0.1:4173' }, data: { group_name: 'FORGED' }
  });
  expect(denied.status()).toBe(403);
  const after = await (await page.request.get('http://127.0.0.1:5117/api/users/profile/me')).json();
  expect(after.user.group_name).toBe(before.user.group_name);
});

test('student cannot promote their account using protected profile fields', async ({ page }) => {
  await signIn(page, '240141052');
  const denied = await page.request.put('http://127.0.0.1:5117/api/users/profile/me', {
    headers: { Origin: 'http://127.0.0.1:4173' }, data: { role: 'admin', is_superadmin: 1 }
  });
  expect(denied.status()).toBe(403);
  const identity = await (await page.request.get('http://127.0.0.1:5117/api/auth/me')).json();
  expect(identity.user.role).toBe('student');
  expect(Boolean(Number(identity.user.is_superadmin))).toBe(false);
});

test('anonymous requests cannot access privileged resources or initialize security features', async ({ request }) => {
  for (const path of ['/api/users', '/api/ops/security-audit', '/api/auth/mfa/status']) {
    expect((await request.get('http://127.0.0.1:5117' + path)).status()).toBe(401);
  }
  expect((await request.post('http://127.0.0.1:5117/api/ops/audit-integrity/verify', { data: {} })).status()).toBe(401);
  expect((await request.post('http://127.0.0.1:5117/api/auth/mfa/reset', { data: { targetId: 1 } })).status()).toBe(401);
});

test('password change signs out and requires the new password', async ({ page }) => {
  await signIn(page, 'erbol.abdusatov@alatoo.edu.kg');
  await page.getByRole('button', { name: 'Open Profile', exact: true }).click();
  await page.getByLabel('Current password', { exact: true }).fill(password);
  await page.getByLabel('New password', { exact: true }).fill('CampusOS-E2E-Replaced-2026!');
  await page.getByLabel('Confirm new password', { exact: true }).fill('CampusOS-E2E-Replaced-2026!');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.locator('#campusos-login')).toBeVisible();
  expect((await page.request.get('http://127.0.0.1:5117/api/auth/me')).status()).toBe(401);
  await signIn(page, 'erbol.abdusatov@alatoo.edu.kg', 'CampusOS-E2E-Replaced-2026!');
});
