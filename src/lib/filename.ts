// file.name is attacker-controlled (a direct API request can set it to
// anything, not just what a real file picker would send) and becomes part
// of the public Blob URL. Keep it to safe characters and a sane length
// rather than trusting it verbatim.
export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'file';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
  return cleaned || 'file';
}
