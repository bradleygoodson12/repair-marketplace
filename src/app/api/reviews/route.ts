import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { isOwnBlobUrl } from '@/lib/attachments';
import { authOptions } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  photoUrls: z.array(z.string().url().refine(isOwnBlobUrl, 'Must be an uploaded file.')).max(5).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { bookingId, rating, comment, photoUrls } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { request: true, quote: { include: { proProfile: true } }, review: true },
  });
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  if (booking.request.customerId !== session.user.id) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (booking.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'You can only review completed bookings.' }, { status: 409 });
  }
  if (booking.review) {
    return NextResponse.json({ error: 'You already reviewed this booking.' }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        bookingId,
        proProfileId: booking.quote.proProfileId,
        customerId: session.user.id,
        rating,
        comment,
        photoUrls: photoUrls ?? [],
      },
    });

    const agg = await tx.review.aggregate({
      where: { proProfileId: booking.quote.proProfileId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.proProfile.update({
      where: { id: booking.quote.proProfileId },
      data: {
        avgRating: agg._avg.rating ?? rating,
        reviewCount: agg._count.rating,
      },
    });
  });

  after(() =>
    notify({
      userId: booking.quote.proProfile.userId,
      type: 'NEW_REVIEW',
      title: `New ${rating}-star review: ${booking.request.title}`,
      body: comment,
      url: `/pros/${booking.quote.proProfileId}`,
    }),
  );

  return NextResponse.json({ ok: true });
}
