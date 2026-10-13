import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { count } = await prisma.quickQuoteTemplate.deleteMany({
    where: { id, proProfileId: proProfile.id },
  });
  if (count === 0) return NextResponse.json({ error: 'Template not found.' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
