import { captureRequestError } from '@sentry/nextjs';
import type { Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Sentry's DSN isn't configured in this project today (see sentry.server/
// edge.config — captureRequestError no-ops without one), so this is
// currently the only thing actually watching: it catches every error that
// escapes a route handler, server action, or render uncaught, logs it to
// /admin/errors, and alerts admins — see src/lib/admin-alerts.ts. Guarded to
// the Node runtime since reportAdminError uses Prisma, which the edge
// runtime can't run; every route in this app is Node-only today anyway.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === 'edge') {
    await captureRequestError(err, request, context);
    return;
  }

  const { reportAdminError } = await import('@/lib/admin-alerts');
  await Promise.all([
    captureRequestError(err, request, context),
    reportAdminError(context.routePath || request.path, err, {
      method: request.method,
      routeType: context.routeType,
    }),
  ]);
};
