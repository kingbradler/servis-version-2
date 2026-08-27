import { apiFetch } from "@/lib/api/client";

import type {
  PaginatedServices,
  PublicServiceFilters,
  ServiceCreatePayload,
  ServiceImage,
  ServicePublic,
  ServiceSeller,
  ServiceUpdatePayload,
} from "../types/service.types";

function toQuery(params?: PublicServiceFilters): string {
  if (!params) return "";
  const query = new URLSearchParams();
  if (params.city) query.set("city", params.city);
  if (params.category) query.set("category", params.category);
  if (params.min_price != null) query.set("min_price", String(params.min_price));
  if (params.max_price != null) query.set("max_price", String(params.max_price));
  if (params.price_type) query.set("price_type", params.price_type);
  if (params.search) query.set("search", params.search);
  if (params.featured) query.set("featured", "true");
  if (params.ordering) query.set("ordering", params.ordering);
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  if (params.latitude != null) query.set("latitude", String(params.latitude));
  if (params.longitude != null) query.set("longitude", String(params.longitude));
  if (params.radius != null) query.set("radius", String(params.radius));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function getPublicServices(
  params?: PublicServiceFilters
): Promise<PaginatedServices | ServicePublic[]> {
  return apiFetch(`/services/${toQuery(params)}`);
}

export async function getPublicService(id: string): Promise<ServicePublic> {
  return apiFetch<ServicePublic>(`/services/${id}/`);
}

export async function getSellerServices(params?: {
  status?: string;
  page?: number;
}): Promise<PaginatedServices<ServiceSeller> | ServiceSeller[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  const qs = query.toString();
  return apiFetch(`/seller/services/${qs ? `?${qs}` : ""}`);
}

export async function getSellerService(id: string): Promise<ServiceSeller> {
  return apiFetch<ServiceSeller>(`/seller/services/${id}/`);
}

export async function createService(
  payload: ServiceCreatePayload
): Promise<ServiceSeller> {
  return apiFetch<ServiceSeller>("/seller/services/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateService(
  id: string,
  payload: ServiceUpdatePayload
): Promise<ServiceSeller> {
  return apiFetch<ServiceSeller>(`/seller/services/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function archiveService(id: string): Promise<ServiceSeller> {
  return apiFetch<ServiceSeller>(`/seller/services/${id}/archive/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function publishService(id: string): Promise<ServiceSeller> {
  return apiFetch<ServiceSeller>(`/seller/services/${id}/publish/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function listSellerServiceImages(
  serviceId: string
): Promise<ServiceImage[]> {
  return apiFetch<ServiceImage[]>(`/seller/services/${serviceId}/images/`);
}

export async function uploadSellerServiceImage(
  serviceId: string,
  file: File,
  options?: { altText?: string; order?: number }
): Promise<ServiceImage> {
  const form = new FormData();
  form.append("image", file);
  if (options?.altText) form.append("alt_text", options.altText);
  if (options?.order != null) form.append("order", String(options.order));
  return apiFetch<ServiceImage>(`/seller/services/${serviceId}/images/`, {
    method: "POST",
    body: form,
  });
}

export async function deleteSellerServiceImage(
  serviceId: string,
  imageId: string
): Promise<void> {
  return apiFetch<void>(`/seller/services/${serviceId}/images/${imageId}/`, {
    method: "DELETE",
  });
}

export function formatServicePrice(
  price: string | null,
  priceType: string
): string {
  if (priceType === "QUOTE") return "Sur devis";
  if (price == null || price === "") return "—";
  const amount = Number(price);
  const formatted = Number.isFinite(amount)
    ? new Intl.NumberFormat("fr-MA", {
        style: "currency",
        currency: "MAD",
        maximumFractionDigits: 2,
      }).format(amount)
    : `${price} MAD`;
  if (priceType === "FROM") return `À partir de ${formatted}`;
  return formatted;
}
