import { describe, expect, it } from 'vitest';

import { filenameFromUrl, isOwnBlobUrl, isPdfUrl } from './attachments';

describe('isPdfUrl', () => {
  it('matches a .pdf URL', () => {
    expect(isPdfUrl('https://example.public.blob.vercel-storage.com/report.pdf')).toBe(true);
  });

  it('matches a .pdf URL with a query string', () => {
    expect(isPdfUrl('https://example.com/report.pdf?foo=bar')).toBe(true);
  });

  it('does not match a non-pdf URL', () => {
    expect(isPdfUrl('https://example.com/photo.jpg')).toBe(false);
  });
});

describe('filenameFromUrl', () => {
  it('strips the Blob random suffix off a filename', () => {
    expect(filenameFromUrl('https://x.public.blob.vercel-storage.com/repair-docs/report-abc123XYZ987654321qw.pdf')).toBe(
      'report.pdf',
    );
  });

  it('decodes URL-encoded characters', () => {
    expect(filenameFromUrl('https://x.public.blob.vercel-storage.com/photos/my%20photo.jpg')).toBe('my photo.jpg');
  });

  it('falls back to the raw input on an unparseable URL', () => {
    expect(filenameFromUrl('not a url')).toBe('not a url');
  });
});

describe('isOwnBlobUrl', () => {
  it('accepts a real Vercel Blob URL', () => {
    expect(isOwnBlobUrl('https://abc123.public.blob.vercel-storage.com/photos/x.jpg')).toBe(true);
  });

  it('rejects http (non-https)', () => {
    expect(isOwnBlobUrl('http://abc123.public.blob.vercel-storage.com/photos/x.jpg')).toBe(false);
  });

  it('rejects a spoofed subdomain pretending to be the blob host', () => {
    expect(isOwnBlobUrl('https://public.blob.vercel-storage.com.evil.com/x.jpg')).toBe(false);
  });

  it('rejects an unrelated host entirely', () => {
    expect(isOwnBlobUrl('https://evil.com/x.jpg')).toBe(false);
  });

  it('rejects a non-URL string instead of throwing', () => {
    expect(isOwnBlobUrl('not a url')).toBe(false);
  });
});
