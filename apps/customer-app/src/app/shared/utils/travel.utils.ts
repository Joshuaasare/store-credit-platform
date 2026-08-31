// Rough travel estimates from straight-line (haversine) distance. Real road
// distance is longer and traffic varies — these are communication aids, not
// ETAs. Time math stays in minutes; callers format via formatTravel.

export const WALK_KMH = 5;
export const DRIVE_KMH = 25;

export function formatDistance(km: number | null): string {
  if (km == null) return "—";
  if (km < 1) return `${km.toFixed(1)} km`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function travelMinutes(km: number | null, kmh: number): number | null {
  if (km == null) return null;
  return Math.max(1, Math.round((km / kmh) * 60));
}

export function formatTravel(min: number): string {
  if (min < 60) return `${min} min`;
  return `${Math.round(min / 60)} hr`;
}