import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@poker/shared': path.resolve(__dirname, 'shared/dist/index.js'),
    },
  },
  test: {
    include: ['server/src/__tests__/**/*.test.ts'],
    globals: true,
  },
});
