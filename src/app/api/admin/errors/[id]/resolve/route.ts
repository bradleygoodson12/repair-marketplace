import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const { count } = await prisma.errorLog.updateMany({ where: { id }, data: { resolvedAt: new Date() } });
  if (count === 0) return NextResponse.json({ error: 'Error log not found.' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
