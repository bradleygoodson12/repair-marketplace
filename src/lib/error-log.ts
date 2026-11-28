import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

/**
 * Persists an error to /admin/errors. Deliberately depends on nothing but
 * prisma — email.ts's own send failure handler needs to call this without
 * any risk of pulling email.ts back in and looping (an alert *email* about
 * email sending being broken would hit the same failure and loop forever).
 * See admin-alerts.ts for the version that also alerts admins.
 */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  // Not every error-like value is an Error instance — notably the Resend
  // SDK's own failures, which resolve as a plain { name, message,
  // statusCode } object rather than throwing.
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export async function recordError(
  source: string,
  error: unknown,
  context?: Record<string, unknown>,
): Promise<{ message: string }> {
  const message = errorMessage(error);
  const stack = error instanceof Error ? error.stack ?? null : null;

  try {
    await prisma.errorLog.create({
      data: { source, message, stack, context: (context ?? undefined) as Prisma.InputJsonObject | undefined },
    });
  } catch (e) {
    console.error('[error-log] Failed to persist ErrorLog', e);
  }

  return { message };
}
