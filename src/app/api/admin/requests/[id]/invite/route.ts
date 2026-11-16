import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { getAdminSession } from '@/lib/admin';
import { sendProInvitedEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';

const schema = z.object({ proProfileId: z.string() });

// Quoting isn't category- or capacity-gated today — an invited pro just
// submits a quote the normal way, same fee rules as anyone else. This
// route is purely a targeted nudge: notify one specific pro about one
// specific request.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const request = await prisma.serviceRequest.findUnique({ where: { id }, include: { category: true } });
  if (!request) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });

  const proProfile = await prisma.proProfile.findUnique({
    where: { id: parsed.data.proProfileId },
    include: { user: true },
  });
  if (!proProfile) return NextResponse.json({ error: 'Pro not found.' }, { status: 404 });
  if (!proProfile.verified) {
    return NextResponse.json({ error: 'Only a verified pro can be invited.' }, { status: 409 });
  }

  after(() =>
    sendProInvitedEmail({
      to: proProfile.user.email,
      businessName: proProfile.businessName,
      requestTitle: request.title,
      categoryName: request.category.name,
      requestId: request.id,
    }),
  );
  after(() =>
    notify({
      userId: proProfile.userId,
      type: 'PRO_INVITED_TO_REQUEST',
      title: `You were invited to quote: ${request.title}`,
      url: `/requests/${request.id}`,
    }),
  );

  return NextResponse.json({ ok: true });
}
