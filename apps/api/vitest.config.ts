import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'test-jwt-secret-at-least-32-chars-long!!',
      COOKIE_DOMAIN: 'localhost',
      CORS_ORIGIN: 'http://localhost:5173',
      NODE_ENV: 'development',
      RATE_LIMIT_MAX: '1000',
      RATE_LIMIT_WINDOW_MS: '60000',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
