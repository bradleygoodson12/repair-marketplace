import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { consumeAuthToken } from '@/lib/auth-tokens';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function POST(req: Request) {
  const allowed = await checkRateLimit(`reset-password:${getClientIp(req)}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const record = await consumeAuthToken(parsed.data.token, 'PASSWORD_RESET');
  if (!record) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  // Clicking a link sent to the account's inbox is itself proof of email
  // ownership — resetting a password this way also satisfies verification
  // for an account that never completed that step.
  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash, emailVerified: new Date() },
  });

  return NextResponse.json({ ok: true });
}
