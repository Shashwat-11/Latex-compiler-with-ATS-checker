import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { verifyProjectAccess } from '../middleware/project-access.middleware.js';
import * as projectService from '../services/project.service.js';

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  template: z.enum(['blank', 'resume', 'article', 'report']).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  isArchived: z.boolean().optional(),
});

const duplicateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export async function projectRoutes(app: FastifyInstance) {
  // List user's projects
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { page = '1', limit = '20', search, archived } = request.query as {
      page?: string; limit?: string; search?: string; archived?: string;
    };

    const result = await projectService.listProjects(request.user!.id, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50),
      search,
      archived: archived !== undefined ? archived === 'true' : undefined,
    });

    return reply.status(200).send(result);
  });

  // Create project
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const body = createProjectSchema.parse(request.body);
    const result = await projectService.createProject(request.user!.id, body);

    if ('error' in result) {
      return reply.status(500).send({ error: result.error });
    }

    return reply.status(201).send(result);
  });

  // Get single project
  app.get('/:projectId', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const result = await projectService.getProject(projectId);

    if ('error' in result) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(200).send(result);
  });

  // Update project
  app.patch('/:projectId', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = updateProjectSchema.parse(request.body);
    const result = await projectService.updateProject(projectId, body);

    if ('error' in result) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(200).send(result);
  });

  // Delete project
  app.delete('/:projectId', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const result = await projectService.deleteProject(projectId);
    return reply.status(200).send(result);
  });

  // Duplicate project
  app.post('/:projectId/duplicate', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = duplicateProjectSchema.parse(request.body);
    const result = await projectService.duplicateProject(request.user!.id, projectId, body.name);

    if ('error' in result) {
      const err = result.error!;
      return reply.status(err.code === 'NOT_FOUND' ? 404 : 500).send({ error: err });
    }

    return reply.status(201).send(result);
  });
}
