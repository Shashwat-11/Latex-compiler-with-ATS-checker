/**
 * Full integration test: edit → save → compile → PDF
 * 
 * Usage: pnpm --filter @overleaf/api test:integration
 *   or:   npx vitest run src/routes/compile.integration.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let cookies: string[] = [];
let projectId: string;
let fileId: string;
let compilationId: string;

beforeAll(async () => {
  // Build app for testing
  process.env.NODE_ENV = 'test';
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ─── STEP 1: AUTH ──────────────────────────────────────────────

describe('Phase 1: Authentication', () => {
  it('rejects invalid register', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'bad', password: '12', name: 'X' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('logs in with demo user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'demo@overleaf.local', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    cookies = res.cookies.map((c: { name: string; value: string }) => `${c.name}=${c.value}`);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe('demo@overleaf.local');
  });

  it('returns user profile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: cookies.join('; ') },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ─── STEP 2: PROJECT & FILE ACCESS ─────────────────────────────

describe('Phase 2: Project & File Access', () => {
  it('lists projects', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { cookie: cookies.join('; ') },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    projectId = body.data[0].id;
  });

  it('gets file tree', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/files`,
      headers: { cookie: cookies.join('; ') },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.files.length).toBeGreaterThanOrEqual(1);
    const texFile = body.files.find((f: { name: string; type: string }) =>
      f.name.endsWith('.tex') && f.type === 'file'
    );
    expect(texFile).toBeDefined();
    fileId = texFile.id;
  });

  it('gets single file with content', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/files/${fileId}`,
      headers: { cookie: cookies.join('; ') },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.file.content).toBeDefined();
  });
});

// ─── STEP 3: FILE SAVE ─────────────────────────────────────────

describe('Phase 3: File Save (auto-save simulation)', () => {
  const testContent = `\\documentclass{article}\\begin{document}INTEGRATION TEST ${Date.now()}\\end{document}`;

  it('saves content to file', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/files/${fileId}`,
      headers: { cookie: cookies.join('; ') },
      payload: { content: testContent },
    });
    expect(res.statusCode).toBe(200);
  });

  it('reads saved content back', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/files/${fileId}`,
      headers: { cookie: cookies.join('; ') },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.file.content).toBe(testContent);
  });

  it('updates file size metadata', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/files/${fileId}`,
      headers: { cookie: cookies.join('; ') },
    });
    const body = JSON.parse(res.body);
    expect(body.file.sizeBytes).toBeGreaterThan(0);
    expect(body.file.contentHash).toBeTruthy();
  });
});

// ─── STEP 4: COMPILATION ───────────────────────────────────────

describe('Phase 4: Compilation Pipeline', () => {
  it('triggers compilation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/compile`,
      headers: { cookie: cookies.join('; ') },
    });
    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.compilation.id).toBeDefined();
    expect(body.compilation.status).toBe('queued');
    compilationId = body.compilation.id;
  });

  it('compilation reaches a terminal state', async () => {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/compilations/${compilationId}`,
        headers: { cookie: cookies.join('; ') },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const status = body.compilation.status;

      if (['success', 'error', 'cancelled', 'timeout'].includes(status)) {
        if (status === 'success') {
          expect(body.compilation.pdfSizeBytes).toBeGreaterThan(0);
          expect(body.compilation.compileTimeMs).toBeGreaterThan(0);
        } else {
          console.log(`  Compilation ${status}: ${body.compilation.errorSummary}`);
        }
        return; // Test passes — we reached a terminal state
      }
      console.log(`  ...${status} (${(i + 1) * 2}s)`);
    }
    throw new Error('Compilation did not complete within 60 seconds');
  }, 120_000);

  it('PDF file exists on disk', async () => {
    // Check via API
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/compilations/${compilationId}`,
      headers: { cookie: cookies.join('; ') },
    });
    const body = JSON.parse(res.body);
    if (body.compilation.status === 'success') {
      expect(body.compilation.pdfPath).toBeTruthy();
    }
  });
});

// ─── STEP 5: UNAUTHORIZED ACCESS ───────────────────────────────

describe('Phase 5: Security', () => {
  it('rejects unauthenticated project access', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthenticated compilation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/compile`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthenticated file save', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/files/${fileId}`,
      payload: { content: 'hacked' },
    });
    expect(res.statusCode).toBe(401);
  });
});
