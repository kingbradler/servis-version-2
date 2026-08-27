import type { GeoCoordinates } from "./types";

export const DEFAULT_NEARBY_RADIUS_KM = 10;
export const MAX_NEARBY_RADIUS_KM = 100;

export type GeolocationErrorCode =
  | "unsupported"
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "unknown";

export class GeolocationRequestError extends Error {
  code: GeolocationErrorCode;

  constructor(code: GeolocationErrorCode, message: string) {
    super(message);
    this.name = "GeolocationRequestError";
    this.code = code;
  }
}

export function isGeolocationSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.geolocation !== "undefined"
  );
}

/**
 * Request the user's GPS position.
 * Must be called from an explicit user action (never on page load).
 *
 * Explore « autour de moi » keeps the result in memory / URL only.
 * Seller profile / store forms may persist lat/lng to the API after the user saves.
 */
export function requestUserLocation(options?: {
  timeoutMs?: number;
  maximumAgeMs?: number;
  enableHighAccuracy?: boolean;
}): Promise<GeoCoordinates> {
  if (!isGeolocationSupported()) {
    return Promise.reject(
      new GeolocationRequestError(
        "unsupported",
        "La géolocalisation n'est pas disponible sur cet appareil."
      )
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new GeolocationRequestError(
              "permission_denied",
              "Impossible d'obtenir votre position. Vous pouvez continuer à explorer la carte."
            )
          );
          return;
        }
        if (err.code === err.POSITION_UNAVAILABLE) {
          reject(
            new GeolocationRequestError(
              "position_unavailable",
              "Position GPS indisponible."
            )
          );
          return;
        }
        if (err.code === err.TIMEOUT) {
          reject(
            new GeolocationRequestError(
              "timeout",
              "Délai de géolocalisation dépassé."
            )
          );
          return;
        }
        reject(
          new GeolocationRequestError(
            "unknown",
            err.message || "Erreur de géolocalisation."
          )
        );
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? false,
        timeout: options?.timeoutMs ?? 12_000,
        maximumAge: options?.maximumAgeMs ?? 60_000,
      }
    );
  });
}
