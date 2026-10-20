import bcrypt from 'bcryptjs';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { createAuthToken } from '@/lib/auth-tokens';
import { sendVerificationEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['CUSTOMER', 'PRO']),
});

export async function POST(req: Request) {
  const allowed = await checkRateLimit(`register:${getClientIp(req)}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many signup attempts. Try again later.' }, { status: 429 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, passwordHash, role },
  });

  after(async () => {
    const token = await createAuthToken(user.id, 'EMAIL_VERIFY', EMAIL_VERIFY_TTL_MS);
    await sendVerificationEmail({ to: user.email, token });
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
