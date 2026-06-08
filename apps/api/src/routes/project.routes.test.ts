import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

describe('Project routes - unauthenticated', () => {
  it('GET /api/v1/projects returns 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });

    expect(response.statusCode).toBe(401);
  });

  it('POST /api/v1/projects returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: { name: 'Test Project' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /api/v1/projects/some-id returns 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/00000000-0000-0000-0000-000000000001',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('File routes - unauthenticated', () => {
  it('GET files returns 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/00000000-0000-0000-0000-000000000001/files',
    });

    expect(response.statusCode).toBe(401);
  });

  it('POST files returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/00000000-0000-0000-0000-000000000001/files',
      payload: { name: 'test.tex', type: 'file' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('Compilation routes - unauthenticated', () => {
  it('POST compile returns 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects/00000000-0000-0000-0000-000000000001/compile',
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET compilations returns 401', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/00000000-0000-0000-0000-000000000001/compilations',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('Health check', () => {
  it('is accessible without auth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
  });
});
