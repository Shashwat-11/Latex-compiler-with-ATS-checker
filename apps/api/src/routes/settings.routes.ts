import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { verifyProjectAccess } from '../middleware/project-access.middleware.js';
import * as projectService from '../services/project.service.js';

const updateSettingsSchema = z.object({
  compiler: z.enum(['pdflatex', 'xelatex', 'lualatex']).optional(),
  rootFileId: z.string().uuid().nullable().optional(),
  spellCheckLang: z.string().optional(),
  editorFontSize: z.number().min(10).max(30).optional(),
  autoCompile: z.boolean().optional(),
  compileOnSave: z.boolean().optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/:projectId/settings', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const result = await projectService.getProjectSettings(projectId);
    return reply.status(200).send(result);
  });

  app.patch('/:projectId/settings', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = updateSettingsSchema.parse(request.body);
    const result = await projectService.updateProjectSettings(projectId, body);
    return reply.status(200).send(result);
  });
}
