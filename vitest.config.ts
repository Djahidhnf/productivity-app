import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
      'server-only': path.resolve(import.meta.dirname, './test/mocks/server-only.ts'),
    },
  },
});
