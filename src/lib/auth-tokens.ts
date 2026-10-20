import { randomBytes } from 'crypto';
import type { AuthTokenKind } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export async function createAuthToken(userId: string, kind: AuthTokenKind, ttlMs: number): Promise<string> {
  // A fresh token invalidates any outstanding one of the same kind, so an
  // old email can't be used to verify/reset after a newer one was requested.
  await prisma.authToken.deleteMany({ where: { userId, kind } });

  const token = randomBytes(32).toString('hex');
  await prisma.authToken.create({
    data: { userId, kind, token, expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

/** Looks up and deletes a token in one step — single-use, valid only once. */
export async function consumeAuthToken(token: string, kind: AuthTokenKind) {
  const record = await prisma.authToken.findUnique({ where: { token } });
  if (!record || record.kind !== kind) return null;

  await prisma.authToken.delete({ where: { token } });

  if (record.expiresAt < new Date()) return null;
  return record;
}
