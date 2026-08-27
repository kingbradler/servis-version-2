import { apiFetch } from "@/lib/api/client";

import type {
  PaginatedProducts,
  ProductCreatePayload,
  ProductImage,
  ProductPublic,
  ProductSeller,
  ProductUpdatePayload,
  PublicProductFilters,
} from "../types/product.types";

function toQuery(params?: PublicProductFilters): string {
  if (!params) return "";
  const query = new URLSearchParams();
  if (params.city) query.set("city", params.city);
  if (params.category) query.set("category", params.category);
  if (params.store) query.set("store", params.store);
  if (params.min_price != null) query.set("min_price", String(params.min_price));
  if (params.max_price != null) query.set("max_price", String(params.max_price));
  if (params.search) query.set("search", params.search);
  if (params.featured) query.set("featured", "true");
  if (params.ordering) query.set("ordering", params.ordering);
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function getPublicProducts(
  params?: PublicProductFilters
): Promise<PaginatedProducts | ProductPublic[]> {
  return apiFetch(`/products/${toQuery(params)}`);
}

export async function getPublicProduct(
  storeSlug: string,
  productSlug: string
): Promise<ProductPublic> {
  return apiFetch<ProductPublic>(
    `/stores/${storeSlug}/products/${productSlug}/`
  );
}

export async function getSellerProducts(params?: {
  status?: string;
  page?: number;
}): Promise<PaginatedProducts<ProductSeller> | ProductSeller[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  const qs = query.toString();
  return apiFetch(`/seller/products/${qs ? `?${qs}` : ""}`);
}

export async function getSellerProduct(id: string): Promise<ProductSeller> {
  return apiFetch<ProductSeller>(`/seller/products/${id}/`);
}

export async function createProduct(
  payload: ProductCreatePayload
): Promise<ProductSeller> {
  return apiFetch<ProductSeller>("/seller/products/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(
  id: string,
  payload: ProductUpdatePayload
): Promise<ProductSeller> {
  return apiFetch<ProductSeller>(`/seller/products/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function archiveProduct(id: string): Promise<ProductSeller> {
  return apiFetch<ProductSeller>(`/seller/products/${id}/`, {
    method: "DELETE",
  });
}

export async function publishProduct(id: string): Promise<ProductSeller> {
  return apiFetch<ProductSeller>(`/seller/products/${id}/publish/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function listSellerProductImages(
  productId: string
): Promise<ProductImage[]> {
  return apiFetch<ProductImage[]>(`/seller/products/${productId}/images/`);
}

export async function uploadSellerProductImage(
  productId: string,
  file: File,
  options?: { altText?: string; order?: number }
): Promise<ProductImage> {
  const form = new FormData();
  form.append("image", file);
  if (options?.altText) form.append("alt_text", options.altText);
  if (options?.order != null) form.append("order", String(options.order));
  return apiFetch<ProductImage>(`/seller/products/${productId}/images/`, {
    method: "POST",
    body: form,
  });
}

export async function deleteSellerProductImage(
  productId: string,
  imageId: string
): Promise<void> {
  return apiFetch<void>(`/seller/products/${productId}/images/${imageId}/`, {
    method: "DELETE",
  });
}
