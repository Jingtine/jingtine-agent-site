const { defineConfig, devices } = require('@playwright/test');

const path = require('path');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8081/jingtine-agent-site/',
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run server',
    url: 'http://127.0.0.1:8081/jingtine-agent-site/',
    reuseExistingServer: false,
    cwd: path.resolve(__dirname, '..'),
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'pixel-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
