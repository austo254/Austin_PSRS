import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/env.ts'],
    fileParallelism: false, // tests share one database
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
