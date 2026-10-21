// Playwright config: e2e tests run against the production build served by vite preview. E2E_PORT moves
// the preview server, so two checkouts of the project can run their e2e at the same time.
import { defineConfig } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: `http://localhost:${port}`, viewport: { width: 1920, height: 1080 } },
  webServer: { command: `npx vite preview --port ${port} --strictPort`, url: `http://localhost:${port}` },
});
