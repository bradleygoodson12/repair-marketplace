import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  label: z.string().trim().min(1).max(80),
  priceCents: z.number().int().positive(),
  durationDays: z.number().int().positive().nullable().optional(),
  message: z.string().trim().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can create quick-quote templates.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) return NextResponse.json({ error: 'Complete your pro profile first.' }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const template = await prisma.quickQuoteTemplate.create({
    data: {
      proProfileId: proProfile.id,
      label: parsed.data.label,
      priceCents: parsed.data.priceCents,
      durationDays: parsed.data.durationDays ?? null,
      message: parsed.data.message || null,
    },
  });

  return NextResponse.json({ id: template.id });
}
