import { sendAppointmentReminderEmail } from '@/lib/email';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';

// A reminder window wide enough that this check, run once daily (see
// check-stale-bids — folded in here rather than registered as its own
// Vercel Cron entry, since the Hobby plan caps both cron frequency and cron
// count), can't miss an appointment between runs. reminderSentAt makes this
// idempotent regardless of how many times it runs inside the window.
const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function sendAppointmentReminders(): Promise<number> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      scheduledDate: { gte: now, lte: windowEnd },
      reminderSentAt: null,
    },
    include: {
      quote: { include: { proProfile: { include: { user: true } } } },
      request: { include: { customer: true } },
    },
  });

  for (const booking of bookings) {
    await Promise.all([
      sendAppointmentReminderEmail({
        to: booking.request.customer.email,
        requestTitle: booking.request.title,
        scheduledDate: booking.scheduledDate,
        requestId: booking.requestId,
      }),
      sendAppointmentReminderEmail({
        to: booking.quote.proProfile.user.email,
        requestTitle: booking.request.title,
        scheduledDate: booking.scheduledDate,
        requestId: booking.requestId,
      }),
      notify({
        userId: booking.request.customerId,
        type: 'APPOINTMENT_REMINDER',
        title: `Upcoming appointment: ${booking.request.title}`,
        url: `/requests/${booking.requestId}`,
      }),
      notify({
        userId: booking.quote.proProfile.userId,
        type: 'APPOINTMENT_REMINDER',
        title: `Upcoming appointment: ${booking.request.title}`,
        url: `/requests/${booking.requestId}`,
      }),
    ]);
    await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } });
  }

  return bookings.length;
}
