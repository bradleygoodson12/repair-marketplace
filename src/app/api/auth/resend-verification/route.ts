import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthToken } from '@/lib/auth-tokens';
import { sendVerificationEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({ email: z.string().email() });
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

// Always returns the same generic response regardless of whether the email
// is registered or already verified — avoids leaking account existence.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const normalizedEmail = parsed.data.email.toLowerCase();
  const genericResponse = NextResponse.json({
    ok: true,
    message: "If that email is registered and not yet verified, we've sent a new verification link.",
  });

  const allowed = await checkRateLimit(`resend-verify:${getClientIp(req)}`, 5, 15 * 60 * 1000);
  if (!allowed) return genericResponse;
  const allowedByEmail = await checkRateLimit(`resend-verify-email:${normalizedEmail}`, 3, 15 * 60 * 1000);
  if (!allowedByEmail) return genericResponse;

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (user && !user.emailVerified) {
    after(async () => {
      const token = await createAuthToken(user.id, 'EMAIL_VERIFY', EMAIL_VERIFY_TTL_MS);
      await sendVerificationEmail({ to: user.email, token });
    });
  }

  return genericResponse;
}
