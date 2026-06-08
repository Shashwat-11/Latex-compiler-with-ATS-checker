import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error.validation) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation.reduce(
          (acc, err) => {
            const path = err.instancePath.replace(/^\//, '') || 'body';
            if (!acc[path]) acc[path] = [];
            acc[path].push(err.message!);
            return acc;
          },
          {} as Record<string, string[]>,
        ),
      },
    });
  }

  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
  }

  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    error: {
      code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: statusCode >= 500 ? 'An internal error occurred' : error.message,
    },
  });
}
