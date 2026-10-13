import { describe, expect, it } from 'vitest';

import { isValidZip, zipDistanceMiles } from './zip';

describe('isValidZip', () => {
  it('accepts a real US zip code', () => {
    expect(isValidZip('29401')).toBe(true);
  });

  it('rejects a made-up zip code', () => {
    expect(isValidZip('00000')).toBe(false);
  });

  it('rejects non-zip input', () => {
    expect(isValidZip('not-a-zip')).toBe(false);
  });
});

describe('zipDistanceMiles', () => {
  it('returns 0 for the same zip code', () => {
    expect(zipDistanceMiles('29401', '29401')).toBe(0);
  });

  it('returns a positive distance between two real, different zip codes', () => {
    const distance = zipDistanceMiles('29401', '29464');
    expect(distance).not.toBeNull();
    expect(distance as number).toBeGreaterThan(0);
  });

  it('returns null when either zip is unrecognized', () => {
    expect(zipDistanceMiles('00000', '29401')).toBeNull();
    expect(zipDistanceMiles('29401', '00000')).toBeNull();
  });
});
