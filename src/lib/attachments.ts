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

// Every URL we store as a request "attachment" is displayed back to other
// users (pros viewing a request) as a clickable link or an auto-loading
// <img>. Without this check, an API consumer could submit any URL — e.g. a
// phishing page dressed up as "inspection-report.pdf" — since the only
// validation otherwise is "is this syntactically a URL". Only accept files
// our own /api/upload actually produced.
export function isOwnBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && /\.public\.blob\.vercel-storage\.com$/i.test(hostname);
  } catch {
    return false;
  }
}
