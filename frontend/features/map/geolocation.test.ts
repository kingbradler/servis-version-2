import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isGeolocationSupported,
  requestUserLocation,
} from "./geolocation";

describe("requestUserLocation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects when geolocation is unsupported", async () => {
    vi.stubGlobal("navigator", {});
    expect(isGeolocationSupported()).toBe(false);
    await expect(requestUserLocation()).rejects.toMatchObject({
      code: "unsupported",
    });
  });

  it("resolves when permission is granted", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          success: (pos: GeolocationPosition) => void
        ) => {
          success({
            coords: {
              latitude: 35.76,
              longitude: -5.83,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          });
        },
      },
    });
    await expect(requestUserLocation()).resolves.toEqual({
      latitude: 35.76,
      longitude: -5.83,
    });
  });

  it("maps permission denied", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          _s: unknown,
          error: (err: GeolocationPositionError) => void
        ) => {
          error({
            code: 1,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: "denied",
          } as GeolocationPositionError);
        },
      },
    });
    await expect(requestUserLocation()).rejects.toMatchObject({
      code: "permission_denied",
    });
    await expect(requestUserLocation()).rejects.toThrow(
      /Impossible d'obtenir votre position/
    );
  });
});
