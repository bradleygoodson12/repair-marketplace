import { zipDistanceMiles } from '@/lib/zip';

// Launch-market gate: while the platform is restricted to a single market,
// any zip outside this radius of the center is turned away rather than
// silently onboarded into a city with no coverage on either side. Remove
// this gate (or raise the radius) once ready to expand past the launch market.
export const LAUNCH_AREA_CENTER_ZIP = '29401'; // Charleston, SC (downtown)
export const LAUNCH_AREA_RADIUS_MILES = 50;

export const OUT_OF_LAUNCH_AREA_MESSAGE =
  "We're only serving the Charleston, SC area right now, but we'd love to serve your area in the future — email admin@repairbee.com to request it.";

/** A zip we don't recognize is treated as out of area, same as one that's genuinely too far. */
export function isInLaunchArea(zip: string): boolean {
  const distance = zipDistanceMiles(zip, LAUNCH_AREA_CENTER_ZIP);
  return distance !== null && distance <= LAUNCH_AREA_RADIUS_MILES;
}
