import { describe, expect, it } from "vitest";

import { formatDistanceKm } from "./format-distance";

describe("formatDistanceKm", () => {
  it("formats meters under 1 km", () => {
    expect(formatDistanceKm(0.65)).toBe("650\u00a0m");
  });

  it("formats kilometres with comma", () => {
    expect(formatDistanceKm(2.4)).toBe("2,4\u00a0km");
  });

  it("returns null for missing values", () => {
    expect(formatDistanceKm(null)).toBeNull();
    expect(formatDistanceKm(undefined)).toBeNull();
  });
});
