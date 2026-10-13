import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  image: z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.').nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});

// Shared by both customer and pro dashboards — this is the underlying
// User's own account photo/phone, separate from a pro's public business
// photo (ProProfile.photoUrl), which a pro may reasonably want to differ
// from their personal account photo.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      image: parsed.data.image,
      phone: parsed.data.phone || null,
    },
  });

  return NextResponse.json({ ok: true });
}
