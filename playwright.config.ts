import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:4173', ...devices['iPhone 15'] },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: true },
});
