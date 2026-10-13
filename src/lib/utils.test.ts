import { describe, expect, it } from 'vitest';

import { formatCents, formatDate } from './utils';

describe('formatCents', () => {
  it('formats whole dollar amounts', () => {
    expect(formatCents(2000)).toBe('$20.00');
  });

  it('formats amounts with cents', () => {
    expect(formatCents(14999)).toBe('$149.99');
  });

  it('formats zero', () => {
    expect(formatCents(0)).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('formats a Date object as "Mon D, YYYY"', () => {
    expect(formatDate(new Date('2026-03-05T12:00:00Z'))).toBe('Mar 5, 2026');
  });

  it('formats a date string the same way', () => {
    expect(formatDate('2026-03-05T12:00:00Z')).toBe('Mar 5, 2026');
  });
});
