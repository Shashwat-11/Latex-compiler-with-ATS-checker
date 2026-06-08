import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes.js';
import { userRoutes } from './user.routes.js';
import { projectRoutes } from './project.routes.js';
import { settingsRoutes } from './settings.routes.js';
import { fileRoutes } from './file.routes.js';
import { compilationRoutes } from './compilation.routes.js';
import { atsRoutes } from './ats.routes.js';
import { aiRoutes } from './ai.routes.js';
import { healthRoutes } from './health.routes.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(projectRoutes, { prefix: '/api/v1/projects' });
  await app.register(settingsRoutes, { prefix: '/api/v1/projects' });
  await app.register(fileRoutes, { prefix: '/api/v1/projects' });
  await app.register(compilationRoutes, { prefix: '/api/v1/projects' });
  await app.register(atsRoutes, { prefix: '/api/v1/projects' });
  await app.register(aiRoutes, { prefix: '/api/v1' });
}
