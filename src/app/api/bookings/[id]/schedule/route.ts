import { getServerSession } from 'next-auth';
import { NextResponse, after } from 'next/server';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { sendAppointmentScheduledEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';

const schema = z.object({ scheduledDate: z.string().datetime().or(z.string().min(1)) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const scheduledDate = new Date(parsed.data.scheduledDate);
  if (Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'Not a valid date.' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      quote: { include: { proProfile: { include: { user: true } } } },
      request: { include: { customer: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });

  const isCustomer = booking.request.customerId === session.user.id;
  const isBookedPro = booking.quote.proProfile.userId === session.user.id;
  if (!isCustomer && !isBookedPro) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }
  if (booking.status !== 'SCHEDULED' && booking.status !== 'IN_PROGRESS') {
    return NextResponse.json({ error: 'This booking is no longer active.' }, { status: 409 });
  }

  // Changing the date re-arms the reminder — otherwise a reschedule to a
  // later date could sail by with the reminder already "used up".
  await prisma.booking.update({ where: { id: booking.id }, data: { scheduledDate, reminderSentAt: null } });

  // Notify whichever side didn't make the change.
  const notifyCustomer = !isCustomer;
  const notifyPro = !isBookedPro;

  if (notifyCustomer) {
    after(() =>
      sendAppointmentScheduledEmail({
        to: booking.request.customer.email,
        requestTitle: booking.request.title,
        scheduledDate,
        requestId: booking.requestId,
      }),
    );
    after(() =>
      notify({
        userId: booking.request.customerId,
        type: 'APPOINTMENT_SCHEDULED',
        title: `Appointment scheduled: ${booking.request.title}`,
        url: `/requests/${booking.requestId}`,
      }),
    );
  }
  if (notifyPro) {
    after(() =>
      sendAppointmentScheduledEmail({
        to: booking.quote.proProfile.user.email,
        requestTitle: booking.request.title,
        scheduledDate,
        requestId: booking.requestId,
      }),
    );
    after(() =>
      notify({
        userId: booking.quote.proProfile.userId,
        type: 'APPOINTMENT_SCHEDULED',
        title: `Appointment scheduled: ${booking.request.title}`,
        url: `/requests/${booking.requestId}`,
      }),
    );
  }

  return NextResponse.json({ ok: true });
}
