import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import * as authService from '../services/auth.service.js';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function userRoutes(app: FastifyInstance) {
  app.patch('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const body = updateUserSchema.parse(request.body);
    const userId = request.user.id;

    const result = await authService.updateUser(userId, body);

    if ('error' in result) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(200).send({ user: result.user });
  });

  app.patch('/me/password', { preHandler: [authenticate] }, async (request, reply) => {
    const body = changePasswordSchema.parse(request.body);
    const userId = request.user.id;

    const result = await authService.changePassword(userId, body.currentPassword, body.newPassword);

    if ('error' in result) {
      const err = result.error!;
      const status = err.code === 'INVALID_CREDENTIALS' ? 400 : 404;
      return reply.status(status).send({ error: err });
    }

    return reply.status(200).send({ success: result.success });
  });
}
