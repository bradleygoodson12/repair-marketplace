// Same env var email.ts uses for absolute links — one source of truth for
// the site's public origin across metadata, sitemap, and structured data.
export function siteUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}
