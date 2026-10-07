import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  property: z.object({
    addressLine1: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
  }),
  items: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1),
        description: z.string().min(1),
        categoryId: z.string().min(1),
      }),
    )
    .min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const document = await prisma.repairDocument.findUnique({
    where: { id },
    include: { lineItems: true },
  });
  if (!document || document.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  if (document.status === 'SUBMITTED') {
    return NextResponse.json({ error: 'This document has already been submitted.' }, { status: 409 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { property, items } = parsed.data;

  const validLineItemIds = new Set(document.lineItems.map((li) => li.id));
  if (items.some((i) => !validLineItemIds.has(i.id))) {
    return NextResponse.json({ error: 'One or more items do not belong to this document.' }, { status: 400 });
  }

  const createdProperty = await prisma.property.create({
    data: { ownerId: session.user.id, ...property },
  });

  const created: { id: string; title: string }[] = [];

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const request = await tx.serviceRequest.create({
        data: {
          customerId: session.user.id,
          propertyId: createdProperty.id,
          categoryId: item.categoryId,
          title: item.title,
          description: item.description,
        },
      });
      await tx.repairLineItem.update({
        where: { id: item.id },
        data: { categoryId: item.categoryId, title: item.title, description: item.description, serviceRequestId: request.id },
      });
      created.push({ id: request.id, title: request.title });
    }
    await tx.repairDocument.update({ where: { id: document.id }, data: { status: 'SUBMITTED' } });
  });

  return NextResponse.json({ requests: created });
}
