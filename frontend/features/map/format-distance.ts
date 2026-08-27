/**
 * Distance display helpers — prefer backend `distance_km` when present.
 */

export function formatDistanceKm(distanceKm: number | null | undefined): string | null {
  if (distanceKm == null || Number.isNaN(distanceKm)) return null;
  const km = Math.max(0, distanceKm);
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters}\u00a0m`;
  }
  const rounded =
    km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km).toString();
  return `${rounded}\u00a0km`;
}
