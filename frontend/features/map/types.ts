/**
 * Map / geolocation types — Phase 6.4 + 6.5 Mapbox.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface PublicLocation {
  address: string;
  city: string | null;
  neighborhood: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
}

export type MapMarkerKind = "store" | "professional" | "service" | "user";

export interface MapMarker {
  id: string;
  kind: MapMarkerKind;
  coordinates: GeoCoordinates;
  label: string;
  /** Short line under the title (headline, description…). */
  subtitle?: string;
  city?: string | null;
  distanceKm?: number | null;
  priceLabel?: string;
  href?: string;
}

/** Provider contract — Mapbox implements this in Phase 6.5. */
export interface MapProvider {
  readonly name: string;
  isReady(): boolean;
  getAccessToken(): string | null;
}

/** Default map view — Morocco (not a single city). */
export const DEFAULT_MAP_CENTER: GeoCoordinates = {
  latitude: 31.8,
  longitude: -7.1,
};

export const DEFAULT_MAP_ZOOM = 6;
