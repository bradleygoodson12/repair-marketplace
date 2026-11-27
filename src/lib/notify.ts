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
  | 'PROJECT_UPDATE_POSTED'
  | 'CHANGE_ORDER_SUBMITTED'
  | 'CHANGE_ORDER_APPROVAL_REQUESTED'
  | 'CHANGE_ORDER_APPROVED'
  | 'CHANGE_ORDER_DECLINED'
  | 'APPOINTMENT_SCHEDULED'
  | 'APPOINTMENT_REMINDER'
  | 'PRO_INVITED_TO_REQUEST'
  | 'PRO_VERIFIED'
  | 'BOOKING_CANCELLED'
  | 'SUBSCRIPTION_PAST_DUE'
  | 'NEW_REVIEW'
  | 'PRO_NOT_BIDDING'
  | 'PRO_LOW_RATING'
  | 'PRO_HIGH_DECLINE_RATE'
  | 'NEW_PRO_PENDING'
  | 'NEW_REPORT'
  | 'SYSTEM_ERROR'
  | 'WAITLIST_SPOT_OFFERED'
  | 'REQUEST_EXPIRING_SOON'
  | 'REQUEST_EXPIRED';

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
