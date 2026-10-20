const { withSentryConfig } = require('@sentry/nextjs/config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Nothing currently renders a remote image through next/image (the one
    // user-controlled source, request attachments, goes through a plain
    // <img> in AttachmentThumb instead) — scope this to our own Blob store
    // rather than leaving it open to any host.
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
};

// Source map upload (and the org/project/authToken below) only runs when
// SENTRY_AUTH_TOKEN is set in CI/production — harmless no-op locally and in
// any environment without a Sentry project configured yet.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
