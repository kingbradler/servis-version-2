import type { PublicServiceFilters } from "@/features/pro-services/types/service.types";

/** Parse public service filters from URLSearchParams. */
export function parseServiceFilters(
  params: URLSearchParams
): PublicServiceFilters {
  const filters: PublicServiceFilters = {};
  const city = params.get("city");
  const category = params.get("category");
  const search = params.get("search");
  const ordering = params.get("ordering");
  const min_price = params.get("min_price");
  const max_price = params.get("max_price");
  const price_type = params.get("price_type");
  const featured = params.get("featured");
  const page = params.get("page");
  const page_size = params.get("page_size");
  const latitude = params.get("latitude");
  const longitude = params.get("longitude");
  const radius = params.get("radius");

  if (city) filters.city = city;
  if (category) filters.category = category;
  if (search) filters.search = search;
  if (ordering) filters.ordering = ordering;
  if (min_price) filters.min_price = min_price;
  if (max_price) filters.max_price = max_price;
  if (
    price_type === "FIXED" ||
    price_type === "FROM" ||
    price_type === "QUOTE"
  ) {
    filters.price_type = price_type;
  }
  if (featured === "true" || featured === "1") filters.featured = true;
  if (page) filters.page = Number(page) || 1;
  if (page_size) filters.page_size = Number(page_size) || 20;
  if (latitude) filters.latitude = Number(latitude);
  if (longitude) filters.longitude = Number(longitude);
  if (radius) filters.radius = Number(radius);
  return filters;
}

/** Serialize filters to query string (no leading ?). */
export function serializeServiceFilters(
  filters: PublicServiceFilters
): string {
  const query = new URLSearchParams();
  if (filters.city) query.set("city", filters.city);
  if (filters.category) query.set("category", filters.category);
  if (filters.search) query.set("search", filters.search);
  if (filters.ordering) query.set("ordering", filters.ordering);
  if (filters.min_price != null && filters.min_price !== "")
    query.set("min_price", String(filters.min_price));
  if (filters.max_price != null && filters.max_price !== "")
    query.set("max_price", String(filters.max_price));
  if (filters.price_type) query.set("price_type", filters.price_type);
  if (filters.featured) query.set("featured", "true");
  if (filters.latitude != null) query.set("latitude", String(filters.latitude));
  if (filters.longitude != null)
    query.set("longitude", String(filters.longitude));
  if (filters.radius != null) query.set("radius", String(filters.radius));
  if (filters.page && filters.page > 1) query.set("page", String(filters.page));
  if (filters.page_size && filters.page_size !== 20)
    query.set("page_size", String(filters.page_size));
  return query.toString();
}

export function buildServicesHref(filters: PublicServiceFilters): string {
  const qs = serializeServiceFilters(filters);
  return qs ? `/services?${qs}` : "/services";
}
