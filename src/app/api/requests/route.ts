import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { sendRequestSubmittedEmail } from '@/lib/email';
import { isInLaunchArea, OUT_OF_LAUNCH_AREA_MESSAGE } from '@/lib/launch-area';
import { notifyMatchingPros } from '@/lib/notifications';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  categoryId: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  preferredDate: z.string().nullable().optional(),
  photoUrls: z.array(z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.')).max(5).optional(),
  phone: z.string().trim().min(7, 'Enter a phone number.').max(30),
  // Extra people (e.g. the agent's buyer/seller) who get a copy of every
  // quote notification for this request.
  ccEmails: z.array(z.string().trim().email()).max(5).optional().default([]),
  postedAsAgent: z.boolean().optional(),
  clientName: z.string().max(200).optional(),
  clientEmail: z.string().email().max(200).optional().or(z.literal('')),
  clientPhone: z.string().max(30).optional(),
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

  const {
    categoryId,
    title,
    description,
    preferredDate,
    photoUrls,
    phone,
    ccEmails,
    postedAsAgent,
    clientName,
    clientEmail,
    clientPhone,
    property,
  } = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: 'Not a valid service category.' }, { status: 400 });
  }

  if (!isInLaunchArea(property.zip)) {
    return NextResponse.json({ error: OUT_OF_LAUNCH_AREA_MESSAGE }, { status: 403 });
  }

  const request = await prisma.$transaction(async (tx) => {
    // Kept on the account (not just this request) so it's already filled in
    // next time, and so it's there the moment any future request of theirs
    // gets accepted — not shared with a pro until then (see requests/[id]).
    await tx.user.update({ where: { id: session.user.id }, data: { phone } });

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
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        photoUrls: photoUrls ?? [],
        ccEmails,
        postedAsAgent: postedAsAgent ?? false,
        clientName: postedAsAgent ? clientName?.trim() || null : null,
        clientEmail: postedAsAgent ? clientEmail?.trim() || null : null,
        clientPhone: postedAsAgent ? clientPhone?.trim() || null : null,
      },
    });
  });

  after(() => notifyMatchingPros(request.id));
  if (session.user.email) {
    after(() => sendRequestSubmittedEmail({ to: session.user.email!, requestTitle: title, requestId: request.id }));
  }
  after(() =>
    notify({
      userId: session.user.id,
      type: 'REQUEST_SUBMITTED',
      title: `Request submitted: ${title}`,
      url: `/requests/${request.id}`,
    }),
  );

  return NextResponse.json({ id: request.id });
}
