import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { verifyProjectAccess } from '../middleware/project-access.middleware.js';
import * as atsService from '../services/ats/ats.service.js';
import { db, schema } from '@overleaf/db';
import { eq } from 'drizzle-orm';

const analyzeSchema = z.object({
  fileId: z.string().uuid(),
  jdText: z.string().optional(),
});

export async function atsRoutes(app: FastifyInstance) {
  // Trigger ATS analysis
  app.post('/:projectId/ats/analyze', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = analyzeSchema.parse(request.body);

    const compilation = await db.query.compilations.findFirst({
      where: eq(schema.compilations.projectId, projectId),
      orderBy: (compilations: any, { desc }: any) => [desc(compilations.createdAt)],
    });

    if (!compilation || compilation.status !== 'success' || !compilation.pdfPath) {
      return reply.status(400).send({
        error: { code: 'NO_PDF', message: 'No successful compilation found. Please compile your resume first.' },
      });
    }

    try {
      const result = await atsService.analyzeResume(projectId, body.fileId, compilation.id, compilation.pdfPath, body.jdText);
      return reply.status(201).send({ report: result });
    } catch (err) {
      request.log.error(err, 'ATS analysis failed');
      return reply.status(500).send({
        error: { code: 'ATS_ERROR', message: 'Analysis failed. Ensure the PDF contains readable text.' },
      });
    }
  });

  // Get single report
  app.get('/:projectId/ats/report/:reportId', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { reportId } = request.params as { reportId: string };
    const report = await atsService.getAtsReport(reportId);
    if (!report) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
    }
    return reply.status(200).send({ report });
  });

  // Get history
  app.get('/:projectId/ats/history', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
    const result = await atsService.getAtsHistory(projectId, parseInt(page), Math.min(parseInt(limit), 50));
    return reply.status(200).send(result);
  });
}
