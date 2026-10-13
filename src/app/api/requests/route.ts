import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { notifyMatchingPros } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  categoryId: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  budgetMinCents: z.number().int().nonnegative().nullable().optional(),
  budgetMaxCents: z.number().int().nonnegative().nullable().optional(),
  preferredDate: z.string().nullable().optional(),
  photoUrls: z.array(z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.')).max(5).optional(),
  property: z.object({
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CUSTOMER') {
    return NextResponse.json({ error: 'Only customers can post job requests.' }, { status: 403 });
  }

  // Posting a request emails every matching pro — cap it so one account
  // can't blast the same lead-notification fan-out over and over.
  const allowed = await checkRateLimit(`post-request:${session.user.id}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many job posts. Try again in a bit.' }, { status: 429 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { categoryId, title, description, budgetMinCents, budgetMaxCents, preferredDate, photoUrls, property } =
    parsed.data;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: 'Not a valid service category.' }, { status: 400 });
  }

  const request = await prisma.$transaction(async (tx) => {
    const createdProperty = await tx.property.create({
      data: { ownerId: session.user.id, ...property },
    });

    return tx.serviceRequest.create({
      data: {
        customerId: session.user.id,
        propertyId: createdProperty.id,
        categoryId,
        title,
        description,
        budgetMinCents: budgetMinCents ?? null,
        budgetMaxCents: budgetMaxCents ?? null,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        photoUrls: photoUrls ?? [],
      },
    });
  });

  after(() => notifyMatchingPros(request.id));

  return NextResponse.json({ id: request.id });
}
