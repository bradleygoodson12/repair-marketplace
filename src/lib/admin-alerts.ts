import { sendAdminErrorAlertEmail } from '@/lib/email';
import { recordError } from '@/lib/error-log';
import { notify } from '@/lib/notify';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Records an error to /admin/errors and alerts admins — called both from the
 * global onRequestError hook (src/instrumentation.ts), which catches
 * anything that escapes a route/render uncaught, and from specific spots
 * where a failure is deliberately caught and handled, so it would otherwise
 * never surface to anyone (see the repair-documents extraction catch block).
 *
 * `source` identifies where this came from (a route path, or a label like
 * "repair-documents:extract") — every occurrence is logged, but the alert
 * email/notification for a given source is throttled to once every 15
 * minutes so a tight failing loop doesn't spam admins; the full history is
 * always there in the error log regardless.
 */
export async function reportAdminError(
  source: string,
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  const { message } = await recordError(source, error, context);

  const allowed = await checkRateLimit(`admin-error-alert:${source}`, 1, 15 * 60 * 1000);
  if (!allowed) return;

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, email: true } });

  await Promise.all([
    ...admins.map((admin) => sendAdminErrorAlertEmail({ to: admin.email, source, message })),
    ...admins.map((admin) =>
      notify({
        userId: admin.id,
        type: 'SYSTEM_ERROR',
        title: `Error in ${source}`,
        body: message,
        url: '/admin/errors',
      }),
    ),
  ]);
}
