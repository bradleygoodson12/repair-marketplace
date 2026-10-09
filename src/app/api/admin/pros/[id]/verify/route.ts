import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminSession } from '@/lib/admin';
import { sendProVerifiedEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

const schema = z.object({ verified: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.proProfile.findUnique({ where: { id }, include: { user: true } });
  if (!existing) return NextResponse.json({ error: 'Pro not found.' }, { status: 404 });

  await prisma.proProfile.update({ where: { id }, data: { verified: parsed.data.verified } });

  if (parsed.data.verified && !existing.verified) {
    after(() => sendProVerifiedEmail({ to: existing.user.email, businessName: existing.businessName }));
  }

  return NextResponse.json({ ok: true });
}
