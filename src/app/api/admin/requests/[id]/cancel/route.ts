import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  await prisma.serviceRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  return NextResponse.json({ ok: true });
}
