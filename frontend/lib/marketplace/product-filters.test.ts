import { describe, expect, it } from "vitest";

import {
  buildProductsHref,
  parseProductFilters,
  serializeProductFilters,
} from "@/lib/marketplace/product-filters";

describe("parseProductFilters", () => {
  it("parses category, search and price filters", () => {
    const params = new URLSearchParams(
      "category=informatique&search=téléphone&min_price=100&max_price=5000&featured=true&page=2"
    );
    expect(parseProductFilters(params)).toEqual({
      category: "informatique",
      search: "téléphone",
      min_price: "100",
      max_price: "5000",
      featured: true,
      page: 2,
    });
  });

  it("ignores empty params", () => {
    expect(parseProductFilters(new URLSearchParams())).toEqual({});
  });
});

describe("serializeProductFilters / buildProductsHref", () => {
  it("builds shareable products URLs", () => {
    expect(
      buildProductsHref({
        category: "mode",
        min_price: 100,
        max_price: 5000,
      })
    ).toBe("/products?category=mode&min_price=100&max_price=5000");
  });

  it("omits default page", () => {
    expect(serializeProductFilters({ page: 1, page_size: 20 })).toBe("");
    expect(buildProductsHref({})).toBe("/products");
  });
});
