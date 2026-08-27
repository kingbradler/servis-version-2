/**
 * Map provider — Phase 6.5 Mapbox implementation.
 */

import type { MapProvider } from "./types";
import { getMapboxToken, isMapboxConfigured } from "./token";

export class NullMapProvider implements MapProvider {
  readonly name = "null";

  isReady(): boolean {
    return false;
  }

  getAccessToken(): string | null {
    return null;
  }
}

export class MapboxMapProvider implements MapProvider {
  readonly name = "mapbox";

  isReady(): boolean {
    return isMapboxConfigured();
  }

  getAccessToken(): string | null {
    return getMapboxToken();
  }
}

let activeProvider: MapProvider = isMapboxConfigured()
  ? new MapboxMapProvider()
  : new NullMapProvider();

export function getMapProvider(): MapProvider {
  return activeProvider;
}

/** Swap provider (tests / future alternatives). */
export function setMapProvider(provider: MapProvider): void {
  activeProvider = provider;
}

/** Ensure Mapbox is the active provider when a token exists. */
export function ensureMapboxProvider(): MapProvider {
  if (isMapboxConfigured() && activeProvider.name !== "mapbox") {
    activeProvider = new MapboxMapProvider();
  }
  if (!isMapboxConfigured() && activeProvider.name === "mapbox") {
    activeProvider = new NullMapProvider();
  }
  return activeProvider;
}
