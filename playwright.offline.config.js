import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/offline',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4174/websiteSetup/',
    viewport: { width: 390, height: 844 },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: { command: 'npm run preview -- --port 4174 --strictPort --base /websiteSetup/', url: 'http://127.0.0.1:4174/websiteSetup/', reuseExistingServer: false },
});
