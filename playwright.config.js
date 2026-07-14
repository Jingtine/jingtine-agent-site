const { defineConfig, devices } = require('@playwright/test');

const path = require('path');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8081',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: `python -m http.server 8081`,
    url: 'http://127.0.0.1:8081',
    reuseExistingServer: false,
    cwd: path.resolve(__dirname),
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
