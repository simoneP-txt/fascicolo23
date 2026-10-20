// Vite config: relative base so Electron can load dist/index.html from disk; Vitest runs unit tests only.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: { include: ['tests/unit/**/*.test.ts'] },
});
