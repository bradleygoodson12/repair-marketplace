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

module.exports = nextConfig;
