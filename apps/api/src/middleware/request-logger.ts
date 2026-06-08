import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requestLogger(request: FastifyRequest, reply: FastifyReply) {
  const start = Date.now();

  reply.header('X-Request-Id', request.id);

  request.log.info(
    { method: request.method, url: request.url, userAgent: request.headers['user-agent'] },
    'incoming request'
  );

  reply.raw.on('finish', () => {
    const duration = Date.now() - start;
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
      },
      'request completed'
    );
  });
}
