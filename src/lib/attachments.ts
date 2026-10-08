// Vercel Blob URLs keep the uploaded file's original extension in the
// pathname (before its random suffix), so a simple suffix check is reliable
// without fetching the file or trusting a passed-in content type.
export function isPdfUrl(url: string): boolean {
  return /\.pdf($|\?)/i.test(url);
}

export function filenameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    const last = pathname.split('/').pop() ?? url;
    return decodeURIComponent(last).replace(/-[a-zA-Z0-9_-]{20,}(\.\w+)$/, '$1');
  } catch {
    return url;
  }
}
