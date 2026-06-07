import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { verifyProjectAccess } from '../middleware/project-access.middleware.js';
import { db, schema } from '@overleaf/db';
import { eq, desc } from 'drizzle-orm';
import { enqueueCompilation, cancelCompilation } from '../services/compilation/queue.service.js';
import { getPdfBuffer, getLatestCompilationPdf } from '../services/pdf.service.js';
import { randomUUID } from 'node:crypto';

const uuidSchema = z.string().uuid();

export async function compilationRoutes(app: FastifyInstance) {
  // Trigger compilation
  app.post('/:projectId/compile', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    uuidSchema.parse(projectId);
    const compilationId = randomUUID();

    await db.insert(schema.compilations).values({
      id: compilationId,
      projectId,
      initiatorId: request.user!.id,
      status: 'queued',
      compiler: 'pdflatex',
    });

    enqueueCompilation(compilationId, projectId).catch((err) => {
      request.log.error(err, 'Compilation failed');
    });

    const compilation = await db.query.compilations.findFirst({
      where: eq(schema.compilations.id, compilationId),
    });

    return reply.status(202).send({
      compilation: {
        id: compilation!.id,
        projectId: compilation!.projectId,
        initiatorId: compilation!.initiatorId,
        status: compilation!.status,
        compiler: compilation!.compiler,
        createdAt: compilation!.createdAt.toISOString(),
      },
    });
  });

  // Get compilation history
  app.get('/:projectId/compilations', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
    const p = parseInt(page);
    const l = Math.min(parseInt(limit), 50);
    const offset = (p - 1) * l;

    const compilations = await db
      .select()
      .from(schema.compilations)
      .where(eq(schema.compilations.projectId, projectId))
      .orderBy(desc(schema.compilations.createdAt))
      .limit(l)
      .offset(offset);

    return reply.status(200).send({
      data: compilations.map((c) => ({
        id: c.id,
        projectId: c.projectId,
        initiatorId: c.initiatorId,
        status: c.status,
        compiler: c.compiler,
        logOutput: c.logOutput,
        errorSummary: c.errorSummary,
        pdfSizeBytes: c.pdfSizeBytes,
        compileTimeMs: c.compileTimeMs,
        startedAt: c.startedAt?.toISOString() ?? null,
        finishedAt: c.finishedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
      meta: { page: p, limit: l, total: compilations.length, totalPages: 1 },
    });
  });

  // Helper to verify compilation access
  async function verifyCompilationAccess(compilationId: string, userId: string) {
    const compilation = await db.query.compilations.findFirst({
      where: eq(schema.compilations.id, compilationId),
    });
    if (!compilation) return null;

    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.id, compilation.projectId),
    });
    if (!project || project.ownerId !== userId) return null;

    return compilation;
  }

  // SSE stream for compilation status
  app.get('/compilations/:compilationId/stream', { preHandler: [authenticate] }, async (request, reply) => {
    const { compilationId } = request.params as { compilationId: string };
    uuidSchema.parse(compilationId);

    const compilation = await verifyCompilationAccess(compilationId, request.user!.id);
    if (!compilation) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Compilation not found' } });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const sendEvent = (data: unknown) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const interval = setInterval(async () => {
      const current = await db.query.compilations.findFirst({
        where: eq(schema.compilations.id, compilationId),
      });

      if (!current) {
        sendEvent({ status: 'error', message: 'Compilation not found' });
        clearInterval(interval);
        reply.raw.end();
        return;
      }

      sendEvent({
        status: current.status,
        compileTimeMs: current.compileTimeMs,
        pdfUrl: current.status === 'success'
          ? `/api/v1/projects/compilations/${compilationId}/pdf`
          : undefined,
        errorLine: current.errorSummary ?? undefined,
      });

      if (['success', 'error', 'cancelled', 'timeout'].includes(current.status)) {
        clearInterval(interval);
        reply.raw.end();
      }
    }, 500);

    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });

  // Get compilation status (non-SSE)
  app.get('/compilations/:compilationId', { preHandler: [authenticate] }, async (request, reply) => {
    const { compilationId } = request.params as { compilationId: string };
    uuidSchema.parse(compilationId);

    const compilation = await verifyCompilationAccess(compilationId, request.user!.id);
    if (!compilation) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Compilation not found' } });
    }

    return reply.status(200).send({
      compilation: {
        id: compilation.id,
        projectId: compilation.projectId,
        initiatorId: compilation.initiatorId,
        status: compilation.status,
        compiler: compilation.compiler,
        logOutput: compilation.logOutput,
        errorSummary: compilation.errorSummary,
        pdfSizeBytes: compilation.pdfSizeBytes,
        compileTimeMs: compilation.compileTimeMs,
        startedAt: compilation.startedAt?.toISOString() ?? null,
        finishedAt: compilation.finishedAt?.toISOString() ?? null,
        createdAt: compilation.createdAt.toISOString(),
      },
    });
  });

  // Download compiled PDF
  app.get('/compilations/:compilationId/pdf', { preHandler: [authenticate] }, async (request, reply) => {
    const { compilationId } = request.params as { compilationId: string };
    uuidSchema.parse(compilationId);

    const compilation = await verifyCompilationAccess(compilationId, request.user!.id);
    if (!compilation) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Compilation not found' } });
    }

    const pdfBuffer = await getPdfBuffer(compilationId);
    if (!pdfBuffer) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'PDF not found or compilation not successful' },
      });
    }

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'inline')
      .send(pdfBuffer);
  });

  // Get latest PDF for a project
  app.get('/:projectId/pdf/latest', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    const pdfBuffer = await getLatestCompilationPdf(projectId);
    if (!pdfBuffer) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'No compiled PDF available for this project' },
      });
    }

    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'inline')
      .send(pdfBuffer);
  });

  // Cancel compilation
  app.post('/compilations/:compilationId/cancel', { preHandler: [authenticate] }, async (request, reply) => {
    const { compilationId } = request.params as { compilationId: string };
    uuidSchema.parse(compilationId);

    const compilation = await verifyCompilationAccess(compilationId, request.user!.id);
    if (!compilation) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Compilation not found' } });
    }

    await cancelCompilation(compilationId);
    return reply.status(200).send({ success: true });
  });
}
