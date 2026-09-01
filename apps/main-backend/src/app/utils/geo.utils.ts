const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  aLat: number | null,
  aLng: number | null,
  bLat: number | null,
  bLng: number | null,
): number | null {
  if (aLat == null || aLng == null || bLat == null || bLng == null) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

// Picks the branch closest to (custLat, custLng); falls back to the first branch when the customer has no location or when none of the branches carry coordinates.
export interface GeoBranch {
  latitude: number | null;
  longitude: number | null;
}

export function pickNearestBranch<T extends GeoBranch>(
  branches: T[],
  custLat: number | null,
  custLng: number | null,
): T | null {
  if (branches.length === 0) return null;
  if (custLat == null || custLng == null) return branches[0] ?? null;
  let best = branches[0];
  let bestD =
    haversineKm(custLat, custLng, best.latitude, best.longitude) ?? Infinity;
  for (let i = 1; i < branches.length; i++) {
    const d =
      haversineKm(
        custLat,
        custLng,
        branches[i].latitude,
        branches[i].longitude,
      ) ?? Infinity;
    if (d < bestD) {
      best = branches[i];
      bestD = d;
    }
  }
  return best;
}

// Max of an array of epoch-ms values; returns 0 for an empty list (so "no activity" is detectable).

// Sort by distance_km ascending; null distances go last, ties broken by id for stability.
export function sortByDistance<
  T extends { id: number; distance_km: number | null },
>(rows: T[]): T[] {
  return rows.sort((a, b) => {
    if (a.distance_km == null && b.distance_km == null) return a.id - b.id;
    if (a.distance_km == null) return 1;
    if (b.distance_km == null) return -1;
    if (a.distance_km === b.distance_km) return a.id - b.id;
    return a.distance_km - b.distance_km;
  });
}
