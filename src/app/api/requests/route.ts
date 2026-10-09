import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  return NextResponse.json({ id: request.id });
}
