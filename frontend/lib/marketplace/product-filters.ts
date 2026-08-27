import type { PublicProductFilters } from "@/features/products/types/product.types";

/** Parse marketplace product filters from URLSearchParams. */
export function parseProductFilters(
  params: URLSearchParams
): PublicProductFilters {
  const filters: PublicProductFilters = {};
  const city = params.get("city");
  const category = params.get("category");
  const store = params.get("store");
  const search = params.get("search");
  const ordering = params.get("ordering");
  const min_price = params.get("min_price");
  const max_price = params.get("max_price");
  const featured = params.get("featured");
  const page = params.get("page");
  const page_size = params.get("page_size");

  if (city) filters.city = city;
  if (category) filters.category = category;
  if (store) filters.store = store;
  if (search) filters.search = search;
  if (ordering) filters.ordering = ordering;
  if (min_price) filters.min_price = min_price;
  if (max_price) filters.max_price = max_price;
  if (featured === "true" || featured === "1") filters.featured = true;
  if (page) filters.page = Number(page) || 1;
  if (page_size) filters.page_size = Number(page_size) || 20;
  return filters;
}

/** Serialize filters to query string (no leading ?). */
export function serializeProductFilters(
  filters: PublicProductFilters
): string {
  const query = new URLSearchParams();
  if (filters.city) query.set("city", filters.city);
  if (filters.category) query.set("category", filters.category);
  if (filters.store) query.set("store", filters.store);
  if (filters.search) query.set("search", filters.search);
  if (filters.ordering) query.set("ordering", filters.ordering);
  if (filters.min_price != null && filters.min_price !== "")
    query.set("min_price", String(filters.min_price));
  if (filters.max_price != null && filters.max_price !== "")
    query.set("max_price", String(filters.max_price));
  if (filters.featured) query.set("featured", "true");
  if (filters.page && filters.page > 1) query.set("page", String(filters.page));
  if (filters.page_size && filters.page_size !== 20)
    query.set("page_size", String(filters.page_size));
  return query.toString();
}

export function buildProductsHref(filters: PublicProductFilters): string {
  const qs = serializeProductFilters(filters);
  return qs ? `/products?${qs}` : "/products";
}
