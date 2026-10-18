import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { generate } = require('../../backend/node_modules/otplib');

test('restricted enrollment can restart sign-in after an expired challenge', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({ json: { enrollmentRequired: true, challenge: 'expired-enrollment-test' } }));
  await page.goto('/');
  await page.locator('#campusos-login').fill('enrollment.test@example.org');
  await page.locator('#campusos-password').fill('Test-password-only!');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('region', { name: 'Two-factor authentication', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
  await expect(page.locator('#campusos-login')).toBeVisible();
  await expect(page.locator('#campusos-password')).toHaveValue('');
});

test('administrator enrolls MFA, sees recovery codes once and signs in with a recovery code', async ({ page, request }) => {
  const owner = await request.post('http://127.0.0.1:5117/api/auth/login', { data: { login: 'erbol.abdusatov@alatoo.edu.kg', password: 'CampusOS-E2E-Only-2026!' } });
  expect(owner.status()).toBe(200);
  const created = await request.post('http://127.0.0.1:5117/api/users', {
    headers: { Origin: 'http://127.0.0.1:4173' },
    data: { email: 'mfa.admin@example.org', name: 'MFA Test Admin', role: 'admin', password: 'CampusOS-E2E-Only-2026!' }
  });
  expect(created.status()).toBe(201);
  await page.goto('/');
  await page.locator('#campusos-login').fill('mfa.admin@example.org');
  await page.locator('#campusos-password').fill('CampusOS-E2E-Only-2026!');
  await page.locator('button[type="submit"]').click();
  await page.getByRole('button', { name: 'Open Profile', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  const panel = page.getByRole('region', { name: 'Two-factor authentication', exact: true });
  await panel.getByLabel('MFA current password', { exact: true }).fill('CampusOS-E2E-Only-2026!');
  await panel.getByRole('button', { name: 'Set up MFA', exact: true }).click();
  const secret = await panel.getByTestId('mfa-manual-key').textContent();
  await panel.getByLabel('Authenticator code', { exact: true }).fill(await generate({ secret }));
  await panel.getByRole('button', { name: 'Confirm MFA', exact: true }).click();
  await expect(page.getByTestId('mfa-recovery-code')).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const recoveryCode = await page.getByTestId('mfa-recovery-code').first().textContent();
  await page.evaluate(async () => {
    const { api } = await import('/src/api.js');
    await api.getProfile().catch(() => {});
  });
  await expect(page.getByTestId('mfa-recovery-code')).toHaveCount(10);
  await page.getByRole('button', { name: 'Codes saved: sign in again', exact: true }).click();
  await expect(page.locator('#campusos-login')).toBeVisible();
  await page.locator('#campusos-login').fill('mfa.admin@example.org');
  await page.locator('#campusos-password').fill('CampusOS-E2E-Only-2026!');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByLabel('MFA code', { exact: true })).toBeVisible();
  expect((await page.request.get('http://127.0.0.1:5117/api/auth/me')).status()).toBe(401);
  await page.getByLabel('Use a recovery code', { exact: true }).check();
  await page.getByLabel('MFA code', { exact: true }).fill(recoveryCode);
  await page.getByRole('button', { name: 'Verify MFA', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
});
