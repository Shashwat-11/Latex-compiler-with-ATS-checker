import type { FastifyInstance, FastifyReply } from 'fastify';
import { z, ZodError } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import * as authService from '../services/auth.service.js';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function sendZodError(reply: FastifyReply, error: ZodError) {
  return reply.status(400).send({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.') || 'body';
          if (!acc[path]) acc[path] = [];
          acc[path].push(err.message);
          return acc;
        },
        {} as Record<string, string[]>,
      ),
    },
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendZodError(reply, parsed.error);
    }
    const body = parsed.data;

    const result = await authService.register(app, body.email, body.password, body.name);
    
    if ('error' in result) {
      const err = result.error!;
      const status = err.code === 'CONFLICT' ? 409 : 500;
      return reply.status(status).send({ error: err });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    
    reply.setCookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: parseInt(process.env.JWT_ACCESS_TTL || '900'),
    });

    reply.setCookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: parseInt(process.env.JWT_REFRESH_TTL || '604800'),
    });

    return reply.status(201).send({ user: result.user });
  });

  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendZodError(reply, parsed.error);
    }
    const body = parsed.data;

    const result = await authService.login(app, body.email, body.password);

    if ('error' in result) {
      return reply.status(401).send({ error: result.error });
    }

    const isProduction = process.env.NODE_ENV === 'production';

    reply.setCookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: parseInt(process.env.JWT_ACCESS_TTL || '900'),
    });

    reply.setCookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: parseInt(process.env.JWT_REFRESH_TTL || '604800'),
    });

    return reply.status(200).send({ user: result.user });
  });

  app.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const refreshTokenValue = request.cookies.refresh_token;
    
    if (refreshTokenValue) {
      await authService.logout(refreshTokenValue);
    }

    reply.clearCookie('access_token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/api/v1/auth' });

    return reply.status(200).send({ success: true });
  });

  app.post('/refresh', async (request, reply) => {
    const refreshTokenValue = request.cookies.refresh_token;

    if (!refreshTokenValue) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'No refresh token provided' },
      });
    }

    const result = await authService.refreshToken(app, refreshTokenValue);

    if ('error' in result) {
      reply.clearCookie('access_token', { path: '/' });
      reply.clearCookie('refresh_token', { path: '/api/v1/auth' });
      return reply.status(401).send({ error: result.error });
    }

    const isProduction = process.env.NODE_ENV === 'production';

    reply.setCookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: parseInt(process.env.JWT_ACCESS_TTL || '900'),
    });

    reply.setCookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: parseInt(process.env.JWT_REFRESH_TTL || '604800'),
    });

    return reply.status(200).send({ success: true });
  });

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const result = await authService.getMe(userId);

    if ('error' in result) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(200).send({ user: result.user });
  });
}
