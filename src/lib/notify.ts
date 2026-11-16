import { prisma } from '@/lib/prisma';

type NotificationType =
  | 'NEW_LEAD'
  | 'NEW_MESSAGE'
  | 'REQUEST_SUBMITTED'
  | 'QUOTE_SUBMITTED'
  | 'QUOTE_REVISED'
  | 'QUOTE_REVISION_REQUESTED'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_NOT_SELECTED'
  | 'PRO_VERIFIED'
  | 'BOOKING_CANCELLED'
  | 'SUBSCRIPTION_PAST_DUE'
  | 'NEW_REVIEW'
  | 'PRO_NOT_BIDDING'
  | 'WAITLIST_SPOT_OFFERED';

// In-app notifications are best-effort, same spirit as the email sends they
// usually run alongside — a failure here should never break the request
// that triggered it, so errors are swallowed and logged, not thrown.
export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  url?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        url: params.url ?? null,
      },
    });
  } catch (e) {
    console.error('Failed to create notification', e);
  }
}
