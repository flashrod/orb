import { defineConfig } from 'vitest/config';

// Root-level config so main-process and shared tests run alongside renderer
// tests. The Vite dev config lives in vite.config.mts and is unrelated.
export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'website/src/**/*.test.ts'],
    environment: 'node',
  },
});
