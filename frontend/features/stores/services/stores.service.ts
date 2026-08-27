import { apiFetch } from "@/lib/api/client";

import type {
  PaginatedStores,
  PublicStoreFilters,
  SellerAdvancedStats,
  SellerAdvancedStatsPeriod,
  SellerStats,
  StoreCreatePayload,
  StorePublic,
  StoreSeller,
  StoreUpdatePayload,
} from "../types/store.types";

export async function getPublicStores(
  params?: PublicStoreFilters
): Promise<PaginatedStores | StorePublic[]> {
  const query = new URLSearchParams();
  if (params?.city) query.set("city", params.city);
  if (params?.search) query.set("search", params.search);
  if (params?.ordering) query.set("ordering", params.ordering);
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.latitude != null) query.set("latitude", String(params.latitude));
  if (params?.longitude != null)
    query.set("longitude", String(params.longitude));
  if (params?.radius != null) query.set("radius", String(params.radius));
  const qs = query.toString();
  return apiFetch(`/stores/${qs ? `?${qs}` : ""}`);
}

export async function getPublicStore(slug: string): Promise<StorePublic> {
  return apiFetch<StorePublic>(`/stores/${slug}/`);
}

export async function getSellerStore(): Promise<StoreSeller> {
  return apiFetch<StoreSeller>("/seller/store/");
}

export async function createSellerStore(
  payload: StoreCreatePayload
): Promise<StoreSeller> {
  return apiFetch<StoreSeller>("/seller/store/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSellerStore(
  payload: StoreUpdatePayload
): Promise<StoreSeller> {
  return apiFetch<StoreSeller>("/seller/store/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function submitSellerStore(): Promise<StoreSeller> {
  return apiFetch<StoreSeller>("/seller/store/submit/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function uploadSellerStoreMedia(
  kind: "logo" | "banner",
  file: File
): Promise<StoreSeller> {
  const form = new FormData();
  form.append("image", file);
  form.append("kind", kind);
  return apiFetch<StoreSeller>("/seller/store/media/", {
    method: "POST",
    body: form,
  });
}

export async function getSellerStats(): Promise<SellerStats> {
  return apiFetch<SellerStats>("/seller/stats/");
}

export async function getSellerAdvancedStats(
  period: SellerAdvancedStatsPeriod = "30d"
): Promise<SellerAdvancedStats> {
  const query = new URLSearchParams({ period });
  return apiFetch<SellerAdvancedStats>(
    `/seller/stats/advanced/?${query.toString()}`
  );
}
