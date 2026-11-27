import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { sendRequestsBatchSubmittedEmail } from '@/lib/email';
import { notifyMatchingProsForRequests } from '@/lib/notifications';
import { notify } from '@/lib/notify';
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
  // this per item would undo the point of reviewing a long list quickly.
  preferredDate: z.string().nullable().optional(),
  phone: z.string().trim().min(7, 'Enter a phone number.').max(30),
  // Extra people (e.g. the agent's buyer/seller) who get a copy of every
  // quote notification for every request in this batch.
  ccEmails: z.array(z.string().trim().email()).max(5).optional().default([]),
  // Same "applies to every request in this batch" reasoning as preferredDate.
  payAtCloseRequested: z.boolean().optional(),
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
  const { property, items, supportingDocumentUrls, preferredDate, phone, ccEmails, payAtCloseRequested } = parsed.data;

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
    // Kept on the account (not just this batch) so it's already filled in
    // next time, and so it's there the moment any of these requests gets
    // accepted — not shared with a pro until then (see requests/[id]).
    await tx.user.update({ where: { id: session.user.id }, data: { phone } });

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
          preferredDate: preferredDate ? new Date(preferredDate) : null,
          ccEmails,
          payAtCloseRequested: payAtCloseRequested ?? false,
          referredByInspectorId: document.referredByInspectorId,
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

  after(() => notifyMatchingProsForRequests(created.map((r) => r.id)));

  if (session.user.email) {
    const propertyAddress = `${property.addressLine1}, ${property.city}, ${property.state}`;
    after(() =>
      sendRequestsBatchSubmittedEmail({
        to: session.user.email!,
        items: created.map((r) => ({ title: r.title })),
        propertyAddress,
      }),
    );
  }
  after(() =>
    notify({
      userId: session.user.id,
      type: 'REQUEST_SUBMITTED',
      title: `${created.length} request${created.length === 1 ? '' : 's'} submitted: ${property.addressLine1}`,
      url: '/dashboard/customer',
    }),
  );

  return NextResponse.json({ requests: created });
}
