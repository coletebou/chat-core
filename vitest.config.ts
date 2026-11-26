import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Two shared worker threads. Measured on 5.1.2 (7 files, 79 tests): the same wall time as
    // one forked process per file on twelve workers, with about a third less memory. No suite
    // keeps state between files; if one ever has to, set `isolate: true` rather than bending
    // the test.
    pool: 'threads',
    isolate: false,
    maxWorkers: 2,
    include: ['src/**/*.test.ts'],
    // The core never reaches the network: a test that tries fails loudly instead of hanging.
    setupFiles: ['src/test/no-network.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/test/**'],
      reporter: ['text-summary', 'json-summary'],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 80 },
    },
  },
});
