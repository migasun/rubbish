import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:9000',
    headless: true,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npx quasar dev --hostname 0.0.0.0 --port 9000',
    url: 'http://127.0.0.1:9000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  }
});
