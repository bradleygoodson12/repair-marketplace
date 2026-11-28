import { describe, expect, it } from 'vitest';

import type { QuoteRecapRow } from './email';
import { buildCsv, compareRecapRows, formatResponseTime } from './quote-recap';

function row(overrides: Partial<QuoteRecapRow>): QuoteRecapRow {
  return {
    categoryName: 'Plumbing',
    businessName: 'Acme Plumbing',
    priceCents: 10000,
    priceMaxCents: null,
    isEstimate: false,
    avgRating: 0,
    reviewCount: 0,
    email: 'pro@example.com',
    phone: '555-0100',
    responseTimeMs: 0,
    responseTimeLabel: '0m',
    ...overrides,
  };
}

describe('formatResponseTime', () => {
  it('rounds sub-hour responses to minutes, never zero', () => {
    expect(formatResponseTime(30 * 1000)).toBe('1m');
    expect(formatResponseTime(45 * 60 * 1000)).toBe('45m');
  });

  it('formats same-day responses in hours', () => {
    expect(formatResponseTime(5 * 60 * 60 * 1000)).toBe('5h');
  });

  it('formats multi-day responses with a remainder in hours', () => {
    expect(formatResponseTime(28 * 60 * 60 * 1000)).toBe('1d 4h');
    expect(formatResponseTime(48 * 60 * 60 * 1000)).toBe('2d');
  });
});

describe('compareRecapRows', () => {
  it('sorts higher rating first', () => {
    const low = row({ businessName: 'Low', avgRating: 3 });
    const high = row({ businessName: 'High', avgRating: 4.8 });
    expect([low, high].sort(compareRecapRows)).toEqual([high, low]);
  });

  it('breaks a rating tie by faster response time', () => {
    const slow = row({ businessName: 'Slow', avgRating: 4.5, responseTimeMs: 5 * 60 * 60 * 1000 });
    const fast = row({ businessName: 'Fast', avgRating: 4.5, responseTimeMs: 30 * 60 * 1000 });
    expect([slow, fast].sort(compareRecapRows)).toEqual([fast, slow]);
  });

  it('puts an unrated pro behind any rated pro, tie-broken by speed among unrated pros', () => {
    const rated = row({ businessName: 'Rated', avgRating: 2.5 });
    const unratedSlow = row({ businessName: 'UnratedSlow', avgRating: 0, responseTimeMs: 10 * 60 * 60 * 1000 });
    const unratedFast = row({ businessName: 'UnratedFast', avgRating: 0, responseTimeMs: 1 * 60 * 60 * 1000 });
    expect([unratedSlow, rated, unratedFast].sort(compareRecapRows)).toEqual([rated, unratedFast, unratedSlow]);
  });
});

describe('buildCsv', () => {
  it('includes a header row and one row per quote', () => {
    const csv = buildCsv([row({}), row({ businessName: 'Second Co' })]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Trade,Company,Quote,Rating,Response time,Email,Phone');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain('Second Co');
  });

  it('shows "No ratings yet" instead of a 0.0 rating', () => {
    const csv = buildCsv([row({ avgRating: 0, reviewCount: 0 })]);
    expect(csv).toContain('No ratings yet');
  });

  it('marks an estimate and formats price as dollars', () => {
    const csv = buildCsv([row({ priceCents: 65000, isEstimate: true })]);
    expect(csv).toContain('$650.00 (est.)');
  });

  it('formats a range quote as low–high', () => {
    const csv = buildCsv([row({ priceCents: 80000, priceMaxCents: 120000, isEstimate: true })]);
    expect(csv).toContain('$800.00–$1,200.00 (est.)');
  });

  it('quotes a field that contains a comma', () => {
    const csv = buildCsv([row({ businessName: 'Acme, LLC' })]);
    expect(csv).toContain('"Acme, LLC"');
  });

  it('leaves phone blank rather than null when absent', () => {
    const csv = buildCsv([row({ phone: null })]);
    const dataLine = csv.split('\n')[1];
    expect(dataLine.endsWith(',')).toBe(true);
  });
});
