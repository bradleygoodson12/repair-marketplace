import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({ id: z.string().optional() });

// Marks one notification read (id given) or every unread one for this
// user (id omitted). Scoped to userId so one account can't mark another's.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, ...(parsed.data.id ? { id: parsed.data.id } : {}) },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
