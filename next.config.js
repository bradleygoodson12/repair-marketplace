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
};

module.exports = nextConfig;
