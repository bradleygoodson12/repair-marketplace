import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminSession } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

const schema = z.object({ suspended: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (id === session.user.id) {
    return NextResponse.json({ error: "You can't suspend your own account." }, { status: 400 });
  }

  await prisma.user.update({ where: { id }, data: { suspended: parsed.data.suspended } });
  return NextResponse.json({ ok: true });
}
