import { eq } from 'drizzle-orm';
import { db, schema } from '@overleaf/db';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../lib/tokens.js';
import type { FastifyInstance } from 'fastify';

function userToResponse(user: typeof schema.users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function register(
  app: FastifyInstance,
  email: string,
  password: string,
  name: string,
) {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email.toLowerCase()),
  });

  if (existing) {
    return { error: { code: 'CONFLICT', message: 'Email already registered' } as const };
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(schema.users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name,
    })
    .returning();

  if (!user) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' } as const };
  }

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  await db.insert(schema.sessions).values({
    userId: user.id,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const accessToken = generateAccessToken(app, user.id, user.email);

  return {
    user: userToResponse(user),
    accessToken,
    refreshToken,
  };
}

export async function login(app: FastifyInstance, email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email.toLowerCase()),
  });

  if (!user) {
    return { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } as const };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    return { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } as const };
  }

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  await db.insert(schema.sessions).values({
    userId: user.id,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const accessToken = generateAccessToken(app, user.id, user.email);

  return {
    user: userToResponse(user),
    accessToken,
    refreshToken,
  };
}

export async function refreshToken(app: FastifyInstance, oldRefreshToken: string) {
  const tokenHash = hashToken(oldRefreshToken);

  const session = await db.query.sessions.findFirst({
    where: eq(schema.sessions.refreshTokenHash, tokenHash),
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));
    }
    return { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' } as const };
  }

  await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.userId),
  });

  if (!user) {
    return { error: { code: 'UNAUTHORIZED', message: 'User not found' } as const };
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);

  await db.insert(schema.sessions).values({
    userId: user.id,
    refreshTokenHash: newRefreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const accessToken = generateAccessToken(app, user.id, user.email);

  return {
    user: userToResponse(user),
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(refreshTokenValue: string) {
  const tokenHash = hashToken(refreshTokenValue);

  const session = await db.query.sessions.findFirst({
    where: eq(schema.sessions.refreshTokenHash, tokenHash),
  });

  if (session) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));
  }
}

export async function getMe(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  if (!user) {
    return { error: { code: 'NOT_FOUND', message: 'User not found' } as const };
  }

  return { user: userToResponse(user) };
}

export async function updateUser(userId: string, data: { name?: string; avatarUrl?: string | null }) {
  const [user] = await db
    .update(schema.users)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId))
    .returning();

  if (!user) {
    return { error: { code: 'NOT_FOUND', message: 'User not found' } as const };
  }

  return { user: userToResponse(user) };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  if (!user) {
    return { error: { code: 'NOT_FOUND', message: 'User not found' } as const };
  }

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    return { error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } as const };
  }

  const newHash = await hashPassword(newPassword);

  await db
    .update(schema.users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));

  return { success: true as const };
}
