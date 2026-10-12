import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  defaultQuoteMessage: z.string().trim().max(2000).nullable(),
  defaultDurationDays: z.number().int().positive().nullable(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can set quote defaults.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { defaultQuoteMessage, defaultDurationDays } = parsed.data;

  const { count } = await prisma.proProfile.updateMany({
    where: { userId: session.user.id },
    data: {
      defaultQuoteMessage: defaultQuoteMessage || null,
      defaultDurationDays,
    },
  });
  if (count === 0) return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });

  return NextResponse.json({ ok: true });
}
