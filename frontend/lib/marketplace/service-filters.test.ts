import { describe, expect, it } from "vitest";

import {
  buildServicesHref,
  parseServiceFilters,
  serializeServiceFilters,
} from "./service-filters";

describe("parseServiceFilters", () => {
  it("parses discovery params from URL", () => {
    const params = new URLSearchParams(
      "category=plomberie&city=tanger&min_price=50&price_type=FIXED&featured=true&search=plombier"
    );
    expect(parseServiceFilters(params)).toEqual({
      category: "plomberie",
      city: "tanger",
      min_price: "50",
      price_type: "FIXED",
      featured: true,
      search: "plombier",
    });
  });

  it("returns empty object for blank params", () => {
    expect(parseServiceFilters(new URLSearchParams())).toEqual({});
  });
});

describe("serializeServiceFilters / buildServicesHref", () => {
  it("builds shareable services URL", () => {
    expect(
      buildServicesHref({
        category: "plomberie",
        city: "tanger",
        min_price: 100,
        page: 2,
      })
    ).toBe("/services?city=tanger&category=plomberie&min_price=100&page=2");
    expect(serializeServiceFilters({ page: 1, page_size: 20 })).toBe("");
    expect(buildServicesHref({})).toBe("/services");
  });
});
