import { test, expect } from '@playwright/test';

test('HTML and assets deliver the deployment security policy', async ({ request }) => {
  for (const path of ['/', '/profile', '/campusos-mark.svg']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-powered-by']).toBeUndefined();
  }
});

test('CSP blocks injected inline scripts while the application loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.campusosInjectedScriptRan = true';
    document.head.appendChild(script);
  });
  expect(await page.evaluate(() => window.campusosInjectedScriptRan)).toBeUndefined();
});
