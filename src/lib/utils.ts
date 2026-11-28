import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// A quote's price as either one amount or, when priceMaxCents is set, a
// "low–high" range — the one place this formatting lives so every quote
// display (quote cards, dashboards, emails, the CSV recap) renders a range
// the same way.
export function formatQuoteAmount(priceCents: number, priceMaxCents?: number | null): string {
  if (priceMaxCents && priceMaxCents > priceCents) {
    return `${formatCents(priceCents)}–${formatCents(priceMaxCents)}`;
  }
  return formatCents(priceCents);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Validates a `redirect` query param before using it to navigate — must be
// an internal, single-leading-slash path. Rejects protocol-relative URLs
// ("//evil.com"), backslash tricks some browsers treat as protocol-relative
// ("/\evil.com"), and absolute URLs, so a crafted link can't redirect a
// login/signup flow off-site.
export function sanitizeRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null;
  return path;
}
