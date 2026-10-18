import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.mjs',
  workers: 1,
  timeout: 30000,
  reporter: [['list']],
  outputDir: '../output/playwright',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'node e2e/backend.cjs', url: 'http://127.0.0.1:5117/ready', timeout: 60000, reuseExistingServer: false },
    { command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false,
      env: { VITE_API_BASE_URL: 'http://127.0.0.1:5117/api' } }
  ]
});
