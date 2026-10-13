import { prisma } from '@/lib/prisma';

/**
 * Fixed-window rate limiter backed by Postgres (no Redis/KV in this stack).
 * Records this attempt and returns whether it's within `limit` for the
 * trailing `windowMs`. Expired rows for this key are pruned on each call,
 * so the table never grows unbounded.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs);

  await prisma.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: windowStart } } });
  const count = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: windowStart } } });

  if (count >= limit) return false;

  await prisma.rateLimitHit.create({ data: { key } });
  return true;
}

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
