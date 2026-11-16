import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  invoiceUrls: z.array(z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.')).max(20).optional(),
  warrantyUrls: z.array(z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.')).max(20).optional(),
});

// Record-keeping only — replaces the full array each save, same pattern as
// the pro profile's license/portfolio documents. No payment or verification
// happens here.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'PRO') {
    return NextResponse.json({ error: 'Only pros can upload booking documents.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id }, include: { quote: true } });
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile || booking.quote.proProfileId !== proProfile.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const data: { invoiceUrls?: string[]; warrantyUrls?: string[] } = {};
  if (parsed.data.invoiceUrls !== undefined) data.invoiceUrls = parsed.data.invoiceUrls;
  if (parsed.data.warrantyUrls !== undefined) data.warrantyUrls = parsed.data.warrantyUrls;

  await prisma.booking.update({ where: { id: booking.id }, data });

  return NextResponse.json({ ok: true });
}
