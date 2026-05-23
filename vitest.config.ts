import { defineConfig } from 'vitest/config';
import { angular } from '@analogjs/vite-plugin-angular';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    css: { include: [] },
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/test-setup.ts', 'src/main.ts'],
      thresholds: {
        statements: 94,
        branches: 84,
        functions: 91,
        lines: 95,
      },
    },
  },
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/app/core', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/app/shared', import.meta.url)),
      '@domain': fileURLToPath(new URL('./src/app/domains', import.meta.url)),
      '@env': fileURLToPath(new URL('./src/environments', import.meta.url)),
    },
  },
});
