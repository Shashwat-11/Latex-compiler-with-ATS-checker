import type { FastifyInstance } from 'fastify';
import { db } from '@overleaf/db';
import { sql } from 'drizzle-orm';
import { execSync } from 'node:child_process';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    let dbStatus = 'disconnected';
    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = 'connected';
    } catch {}

    let latexStatus = 'unavailable';
    try {
      execSync('docker image inspect overleaf-tex:latest', { stdio: 'ignore' });
      latexStatus = 'available';
    } catch {}

    return {
      status: 'ok',
      version: '0.0.1',
      db: dbStatus,
      latex: latexStatus,
      timestamp: new Date().toISOString(),
    };
  });
}
