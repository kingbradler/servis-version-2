/**
 * Mapbox token helpers — never log or display the token value.
 */

export function getMapboxToken(): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  if (!token) return null;
  return token;
}

export function isMapboxConfigured(): boolean {
  return Boolean(getMapboxToken());
}

/** Dev-only notice when token is missing (never includes the value). */
export function warnMissingMapboxToken(): void {
  if (process.env.NODE_ENV === "development") {
    console.warn("NEXT_PUBLIC_MAPBOX_TOKEN is missing");
  }
}
