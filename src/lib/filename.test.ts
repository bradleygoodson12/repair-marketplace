import { describe, expect, it } from 'vitest';

import { sanitizeFilename } from './filename';

describe('sanitizeFilename', () => {
  it('leaves a normal filename untouched', () => {
    expect(sanitizeFilename('report.pdf')).toBe('report.pdf');
  });

  it('strips a path prefix down to the basename', () => {
    expect(sanitizeFilename('/etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('..\\..\\windows\\system32\\evil.exe')).toBe('evil.exe');
  });

  it('replaces unsafe characters with underscores', () => {
    expect(sanitizeFilename('my photo!@#$.jpg')).toBe('my_photo____.jpg');
  });

  it('truncates to the last 120 characters', () => {
    const longName = 'a'.repeat(200) + '.pdf';
    const result = sanitizeFilename(longName);
    expect(result.length).toBe(120);
    expect(result.endsWith('.pdf')).toBe(true);
  });

  it('falls back to "file" for empty or fully-stripped input', () => {
    expect(sanitizeFilename('')).toBe('file');
  });
});
