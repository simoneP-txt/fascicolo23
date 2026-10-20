// Playwright config: e2e tests run against the production build served by vite preview.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4173', viewport: { width: 1920, height: 1080 } },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173' },
});
