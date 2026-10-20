import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthToken } from '@/lib/auth-tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({ email: z.string().email() });
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

// Always returns the same generic response regardless of whether the email
// is registered — avoids leaking account existence to a caller probing
// arbitrary addresses.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const normalizedEmail = parsed.data.email.toLowerCase();
  const genericResponse = NextResponse.json({
    ok: true,
    message: "If that email is registered, we've sent a password reset link.",
  });

  const allowed = await checkRateLimit(`forgot-password:${getClientIp(req)}`, 5, 15 * 60 * 1000);
  if (!allowed) return genericResponse;
  const allowedByEmail = await checkRateLimit(`forgot-password-email:${normalizedEmail}`, 3, 15 * 60 * 1000);
  if (!allowedByEmail) return genericResponse;

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (user) {
    after(async () => {
      const token = await createAuthToken(user.id, 'PASSWORD_RESET', PASSWORD_RESET_TTL_MS);
      await sendPasswordResetEmail({ to: user.email, token });
    });
  }

  return genericResponse;
}
