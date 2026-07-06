// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Serial for localStorage isolation
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'tests/e2e/report', open: 'never' }],
    ['line'],
  ],
  use: {
    baseURL: 'http://localhost:8099',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // The PWA service worker re-registers itself after freshApp() unregisters
    // it, and SW-mediated fetches bypass page.route() — breaking the hermetic
    // stubs (/api/env.js, fake Sheets endpoint). Block SWs at the driver level.
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'python3 -m http.server 8099',
    url: 'http://localhost:8099',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile Chrome — skips pure-logic security tests (they use test.skip() internally too)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: ['**/05-security.spec.js', '**/07-security-v2.spec.js', '**/08-sheets.spec.js'],
    },
  ],
});
