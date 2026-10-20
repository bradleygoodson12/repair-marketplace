import { NextResponse } from 'next/server';
import { z } from 'zod';

import { consumeAuthToken } from '@/lib/auth-tokens';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  const allowed = await checkRateLimit(`verify-email:${getClientIp(req)}`, 20, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const record = await consumeAuthToken(parsed.data.token, 'EMAIL_VERIFY');
  if (!record) {
    return NextResponse.json({ error: 'This verification link is invalid or has expired.' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } });

  return NextResponse.json({ ok: true });
}
