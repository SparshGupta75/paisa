import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * E2E runs against the exported web build (`npm run build:web`) served by
 * scripts/serve-web.js, which applies the same headers as production. WebKit
 * with an iPhone profile is the closest thing to Safari on iOS that runs in CI.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'iphone-webkit',
      use: { ...devices['iPhone 15'] },
    },
  ],
  webServer: {
    command: `node scripts/serve-web.js --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
