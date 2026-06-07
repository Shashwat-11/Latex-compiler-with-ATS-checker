import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { verifyProjectAccess } from '../middleware/project-access.middleware.js';
import * as fileService from '../services/file.service.js';
import type { FileType } from '@overleaf/shared';

const createFileSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable().optional(),
  type: z.enum(['file', 'folder']),
  content: z.string().optional(),
});

const updateFileSchema = z.object({
  content: z.string().optional(),
  name: z.string().min(1).max(255).optional(),
});

const moveFileSchema = z.object({
  newParentId: z.string().uuid().nullable(),
  newSortOrder: z.number().int().min(0).optional(),
});

const duplicateFileSchema = z.object({
  newName: z.string().min(1).max(255).optional(),
});

export async function fileRoutes(app: FastifyInstance) {
  // Get file tree
  app.get('/:projectId/files', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const result = await fileService.getFileTree(projectId);
    return reply.status(200).send(result);
  });

  // Create file/folder
  app.post('/:projectId/files', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = createFileSchema.parse(request.body) as {
      name: string; parentId?: string | null; type: FileType; content?: string;
    };
    const result = await fileService.createFile(projectId, body);

    if ('error' in result) {
      return reply.status(500).send({ error: result.error });
    }

    return reply.status(201).send(result);
  });

  // Get single file with content
  app.get('/:projectId/files/:fileId', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { fileId } = request.params as { fileId: string };
    const result = await fileService.getFile(fileId);

    if ('error' in result) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(200).send(result);
  });

  // Update file content or rename
  app.patch('/:projectId/files/:fileId', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { fileId } = request.params as { fileId: string };
    const body = updateFileSchema.parse(request.body);
    const result = await fileService.updateFile(fileId, body);

    if ('error' in result) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(200).send(result);
  });

  // Delete file/folder
  app.delete('/:projectId/files/:fileId', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { fileId } = request.params as { fileId: string };
    const result = await fileService.deleteFile(fileId);

    if ('error' in result) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(200).send(result);
  });

  // Move file
  app.post('/:projectId/files/:fileId/move', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { fileId } = request.params as { fileId: string };
    const body = moveFileSchema.parse(request.body);
    const result = await fileService.moveFile(fileId, body);

    if ('error' in result) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(200).send(result);
  });

  // Duplicate file
  app.post('/:projectId/files/:fileId/duplicate', { preHandler: [authenticate, verifyProjectAccess] }, async (request, reply) => {
    const { fileId } = request.params as { fileId: string };
    const body = duplicateFileSchema.parse(request.body);
    const result = await fileService.duplicateFile(fileId, body.newName);

    if ('error' in result) {
      const err = result.error!;
      return reply.status(err.code === 'NOT_FOUND' ? 404 : 500).send({ error: err });
    }

    return reply.status(201).send(result);
  });
}
