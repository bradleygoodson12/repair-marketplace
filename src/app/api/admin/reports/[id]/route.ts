import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

const schema = z.object({ status: z.enum(['RESOLVED', 'DISMISSED']) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { count } = await prisma.report.updateMany({
    where: { id },
    data: { status: parsed.data.status, resolvedAt: new Date() },
  });
  if (count === 0) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
