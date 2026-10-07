/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // @napi-rs/canvas ships a native .node addon, and pdfjs-dist resolves its
  // worker script relative to its own file at runtime — both break when the
  // bundler moves/transforms their files. Load them via plain require()
  // instead, preserving their real on-disk layout.
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
  // Vercel's deploy-time file tracer only ships files it can statically
  // detect a route needs. pdfjs-dist loads its worker script and font/cmap
  // data via dynamic, relative-to-itself imports that tracing misses, which
  // breaks page rendering in production even though a local `next start`
  // (full node_modules, no pruning) never surfaces it. Force the whole
  // package into the one route that uses it.
  outputFileTracingIncludes: {
    '/api/repair-documents': ['./node_modules/pdfjs-dist/**'],
  },
};

module.exports = nextConfig;
