import type { FastifyRequest, FastifyReply } from 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { id: string; email: string };
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // First try cookie-based JWT, fallback to Authorization header
    if (request.cookies.access_token) {
      await request.jwtVerify({ onlyCookie: true });
    } else {
      await request.jwtVerify();
    }
    // Map @fastify/jwt's 'sub' payload to our expected 'id'
    const payload = request.user as Record<string, unknown> | null;
    if (payload && 'sub' in payload) {
      request.user = { id: payload.sub as string, email: payload.email as string };
    }
  } catch {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  try {
    if (request.cookies.access_token) {
      await request.jwtVerify({ onlyCookie: true });
      const payload = request.user as Record<string, unknown> | null;
      if (payload && 'sub' in payload) {
        request.user = { id: payload.sub as string, email: payload.email as string };
      }
    }
  } catch {
    // No-op: user remains undefined — expired tokens are silently ignored
  }
}
