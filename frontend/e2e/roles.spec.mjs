import { test, expect } from '@playwright/test';

const roles = [
  { role: 'student', login: '240141052', password: 'BrowserStudent123!', directoryStatus: 403 },
  { role: 'teacher', login: 'teacher@alatoo.edu.kg', password: 'BrowserTeacher123!', directoryStatus: 403 },
  { role: 'admin', login: 'admin@alatoo.edu.kg', password: 'BrowserAdmin123!', directoryStatus: 200 }
];

for (const account of roles) {
  test(`${account.role}: real login, role boundary, profile and logout`, async ({ page, context, isMobile }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.addInitScript(() => {
      window.campusosCspViolations = [];
      document.addEventListener('securitypolicyviolation', event => {
        window.campusosCspViolations.push(`${event.effectiveDirective}: ${event.blockedURI}`);
      });
    });
    await page.goto('/');
    await expect(page).toHaveTitle(/CampusOS/);
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await page.getByLabel('Email or Student ID').fill(account.login);
    await page.getByLabel('Password', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open user menu' })).toBeVisible();
    const cookie = (await context.cookies()).find(item => item.name === 'campusos_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Open user menu' })).toBeVisible();
    if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click();
    const directory = page.getByRole('button', { name: 'Open User Management', exact: true });
    if (account.role === 'admin') {
      await expect(directory).toBeVisible();
      await directory.click();
      await expect(page.getByRole('heading', { name: 'User Management', exact: true })).toBeVisible();
    } else {
      await expect(directory).toHaveCount(0);
    }
    // A hidden menu is insufficient: the real cookie-authenticated API must agree.
    expect((await context.request.get('/api/users')).status()).toBe(account.directoryStatus);
    if (isMobile && account.role === 'admin') await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Open Profile', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Account Profile', exact: true })).toBeVisible();
    if (account.role === 'student') {
      const denied = await context.request.put('/api/users/profile/me', {
        headers: { Origin: 'http://127.0.0.1:4178' }, data: { group_name: 'FORGED-BROWSER-GROUP' }
      });
      expect(denied.status()).toBe(403);
      expect((await (await context.request.get('/api/users/profile/me')).json()).user.group_name).not.toBe('FORGED-BROWSER-GROUP');
    }
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    await page.getByRole('button', { name: 'Open user menu' }).click();
    await page.getByRole('menuitem', { name: 'Logout', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    expect((await context.request.get('/api/auth/me')).status()).toBe(401);
    expect((await context.cookies()).some(item => item.name === 'campusos_session')).toBe(false);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.campusosCspViolations)).toEqual([]);
  });
}
