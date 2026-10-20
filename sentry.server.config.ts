import * as Sentry from '@sentry/nextjs';

// No-ops when NEXT_PUBLIC_SENTRY_DSN is unset — safe to leave this wired up
// in every environment, including local dev, without an account configured.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
