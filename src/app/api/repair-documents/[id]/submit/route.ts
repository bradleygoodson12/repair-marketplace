import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { notifyMatchingPros } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

const blobUrl = z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.');

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
        photoUrls: z.array(blobUrl).max(5).default([]),
      }),
    )
    .min(1),
  supportingDocumentUrls: z.array(blobUrl).default([]),
  // Applies uniformly to every request created from this batch — asking for
  // these per item would undo the point of reviewing a long list quickly.
  budgetMinCents: z.number().int().positive().nullable().optional(),
  budgetMaxCents: z.number().int().positive().nullable().optional(),
  preferredDate: z.string().nullable().optional(),
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
  const { property, items, supportingDocumentUrls, budgetMinCents, budgetMaxCents, preferredDate } = parsed.data;

  // An id not among this document's AI-extracted line items is one the
  // customer added by hand on the review page — created fresh below instead
  // of updating an existing RepairLineItem.
  const validLineItemIds = new Set(document.lineItems.map((li) => li.id));

  const categoryIds = new Set(items.map((i) => i.categoryId));
  const validCategoryCount = await prisma.category.count({ where: { id: { in: [...categoryIds] } } });
  if (validCategoryCount !== categoryIds.size) {
    return NextResponse.json({ error: 'One or more items have an invalid category.' }, { status: 400 });
  }

  // Every request gets the full source material — the analyzed list plus
  // whatever else was attached — so pros can review it directly instead of
  // relying on an AI-cropped page image per item.
  const attachmentUrls = [...new Set([document.fileUrl, ...supportingDocumentUrls])];
  const pageNumberById = new Map(document.lineItems.map((li) => [li.id, li.pageNumber]));

  const createdProperty = await prisma.property.create({
    data: { ownerId: session.user.id, ...property },
  });

  const created: { id: string; title: string }[] = [];

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      // The item's own photos come first so they're what a pro sees before
      // the shared full-report attachments further down the list.
      const requestPhotoUrls = [...new Set([...item.photoUrls, ...attachmentUrls])];
      const request = await tx.serviceRequest.create({
        data: {
          customerId: session.user.id,
          propertyId: createdProperty.id,
          categoryId: item.categoryId,
          title: item.title,
          description: item.description,
          photoUrls: requestPhotoUrls,
          sourcePageNumber: pageNumberById.get(item.id) ?? null,
          budgetMinCents: budgetMinCents ?? null,
          budgetMaxCents: budgetMaxCents ?? null,
          preferredDate: preferredDate ? new Date(preferredDate) : null,
        },
      });
      if (validLineItemIds.has(item.id)) {
        await tx.repairLineItem.update({
          where: { id: item.id },
          data: {
            categoryId: item.categoryId,
            title: item.title,
            description: item.description,
            photoUrls: item.photoUrls,
            serviceRequestId: request.id,
          },
        });
      } else {
        await tx.repairLineItem.create({
          data: {
            repairDocumentId: document.id,
            rawText: item.title,
            title: item.title,
            description: item.description,
            categoryId: item.categoryId,
            photoUrls: item.photoUrls,
            serviceRequestId: request.id,
          },
        });
      }
      created.push({ id: request.id, title: request.title });
    }
    await tx.repairDocument.update({
      where: { id: document.id },
      data: { status: 'SUBMITTED', supportingDocumentUrls },
    });
  });

  after(() => Promise.all(created.map((r) => notifyMatchingPros(r.id))));

  return NextResponse.json({ requests: created });
}
