import type { FastifyRequest, FastifyReply } from 'fastify';
import { db, schema } from '@overleaf/db';
import { eq } from 'drizzle-orm';

export async function verifyProjectAccess(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const userId = request.user?.id;

  if (!userId) {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId),
  });

  if (!project) {
    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Project not found' },
    });
  }

  if (project.ownerId !== userId) {
    return reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'You do not have access to this project' },
    });
  }
}
