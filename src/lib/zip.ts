import zipcodes from 'zipcodes';

/** Distance in miles between two US zip codes, or null if either is unrecognized. */
export function zipDistanceMiles(zipA: string, zipB: string): number | null {
  const distance = zipcodes.distance(zipA, zipB);
  return typeof distance === 'number' && !Number.isNaN(distance) ? distance : null;
}

export function isValidZip(zip: string): boolean {
  return Boolean(zipcodes.lookup(zip));
}
