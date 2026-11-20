import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';

import { authOptions } from '@/lib/auth';
import { sendRequestSubmittedEmail } from '@/lib/email';
import { isInLaunchArea, OUT_OF_LAUNCH_AREA_MESSAGE } from '@/lib/launch-area';
import { notifyMatchingPros } from '@/lib/notifications';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

// Re-posts an expired request as a brand-new one on the same property —
// same category/title/description/photos, fresh createdAt (so it gets a
// full new 72h window) and a clean status, without making the customer
// re-type the form. The original stays exactly as it is: an EXPIRED record
// the customer can still see.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const allowed = await checkRateLimit(`post-request:${session.user.id}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many job posts. Try again in a bit.' }, { status: 429 });
  }

  const original = await prisma.serviceRequest.findUnique({
    where: { id },
    include: { property: true },
  });
  if (!original || original.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  if (original.status !== 'EXPIRED') {
    return NextResponse.json({ error: 'Only an expired request can be re-submitted.' }, { status: 409 });
  }

  if (!isInLaunchArea(original.property.zip)) {
    return NextResponse.json({ error: OUT_OF_LAUNCH_AREA_MESSAGE }, { status: 403 });
  }

  const request = await prisma.serviceRequest.create({
    data: {
      customerId: session.user.id,
      propertyId: original.propertyId,
      categoryId: original.categoryId,
      title: original.title,
      description: original.description,
      photoUrls: original.photoUrls,
      postedAsAgent: original.postedAsAgent,
      clientName: original.clientName,
      clientEmail: original.clientEmail,
      clientPhone: original.clientPhone,
    },
  });

  after(() => notifyMatchingPros(request.id));
  if (session.user.email) {
    after(() =>
      sendRequestSubmittedEmail({ to: session.user.email!, requestTitle: request.title, requestId: request.id }),
    );
  }
  after(() =>
    notify({
      userId: session.user.id,
      type: 'REQUEST_SUBMITTED',
      title: `Request re-submitted: ${request.title}`,
      url: `/requests/${request.id}`,
    }),
  );

  return NextResponse.json({ id: request.id });
}
