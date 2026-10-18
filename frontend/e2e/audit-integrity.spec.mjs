import { test, expect } from '@playwright/test';
test('administrator sees audit integrity state without an unsafe initialization button', async ({ page }) => {
  await page.goto('/');
  await page.locator('#campusos-login').fill('admin@alatoo.edu.kg');
  await page.locator('#campusos-password').fill('CampusOS-E2E-Only-2026!');
  await page.locator('button[type="submit"]').click();
  await page.getByRole('button', { name: 'Open Security Center', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Audit integrity', exact: true });
  await panel.getByRole('button', { name: 'Verify integrity', exact: true }).click();
  await expect(panel).toContainText('Audit chain has not been initialized.');
  await expect(panel.getByRole('button', { name: /initialize|repair/i })).toHaveCount(0);
});
