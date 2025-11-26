import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        'dist/',
        '.next/',
        'migrations/',
        'scripts/',
        '**/*.md',
        '**/*.json',
        '**/*.wasm',
        '**/*.d.ts',
        '**/Docs/**',
        '**/.gitignore',
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/server': path.resolve(__dirname, './server'),
      '@/client': path.resolve(__dirname, './client'),
      '@/shared': path.resolve(__dirname, './shared'),
    },
  },
});
