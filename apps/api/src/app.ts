import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { securityHeaders } from './middleware/security-headers.js';
import { requestLogger } from './middleware/request-logger.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    },
  });

  // Plugins
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(cookie, {
    secret: env.JWT_SECRET,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'access_token',
      signed: false,
    },
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    // Exclude OPTIONS preflight from rate limiting
    keyGenerator: (request: any) => {
      if (request.method === 'OPTIONS') return '';
      return request.ip;
    },
  });

  // Security headers
  app.addHook('onSend', securityHeaders);

  // Request logging
  app.addHook('onRequest', requestLogger);

  // Error handler
  app.setErrorHandler(errorHandler);

  // Routes
  await registerRoutes(app);

  return app;
}
