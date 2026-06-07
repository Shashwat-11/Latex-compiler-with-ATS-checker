import type { FastifyInstance } from 'fastify';
import { randomBytes, createHash } from 'node:crypto';

export interface TokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export function generateAccessToken(app: FastifyInstance, userId: string, email: string): string {
  return app.jwt.sign(
    { sub: userId, email },
    { expiresIn: parseInt(process.env.JWT_ACCESS_TTL || '900') }
  );
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
