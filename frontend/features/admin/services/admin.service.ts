import { apiFetch } from "@/lib/api/client";

import type {
  AdminCategory,
  AdminCategoryPayload,
  AdminOrder,
  AdminPayment,
  AdminProduct,
  AdminStats,
  AdminStore,
  AdminUser,
  AdminUserUpdatePayload,
  Paginated,
} from "../types/admin.types";

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

// ── Stores ────────────────────────────────────────────────────────────

export async function getAdminStores(params?: {
  status?: string;
  search?: string;
  page?: number;
}): Promise<Paginated<AdminStore> | AdminStore[]> {
  return apiFetch(`/admin/stores/${buildQuery(params)}`);
}

export async function approveStore(id: string): Promise<AdminStore> {
  return apiFetch(`/admin/stores/${id}/approve/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function suspendStore(id: string): Promise<AdminStore> {
  return apiFetch(`/admin/stores/${id}/suspend/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function activateStore(id: string): Promise<AdminStore> {
  return apiFetch(`/admin/stores/${id}/activate/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// ── Products ──────────────────────────────────────────────────────────

export async function getAdminProducts(params?: {
  status?: string;
  search?: string;
  page?: number;
}): Promise<Paginated<AdminProduct> | AdminProduct[]> {
  return apiFetch(`/admin/products/${buildQuery(params)}`);
}

export async function archiveAdminProduct(id: string): Promise<AdminProduct> {
  return apiFetch(`/admin/products/${id}/archive/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// ── Categories ────────────────────────────────────────────────────────

export async function getAdminCategories(): Promise<
  Paginated<AdminCategory> | AdminCategory[]
> {
  return apiFetch("/admin/categories/");
}

export async function createAdminCategory(
  payload: AdminCategoryPayload
): Promise<AdminCategory> {
  return apiFetch("/admin/categories/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCategory(
  id: string,
  payload: AdminCategoryPayload
): Promise<AdminCategory> {
  return apiFetch(`/admin/categories/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ── Orders (read-only) ───────────────────────────────────────────────

export async function getAdminOrders(page = 1): Promise<Paginated<AdminOrder>> {
  return apiFetch(`/admin/orders/?page=${page}`);
}

export async function getAdminOrder(id: string): Promise<AdminOrder> {
  return apiFetch(`/admin/orders/${id}/`);
}

// ── Payments (read-only) ─────────────────────────────────────────────

export async function getAdminPayments(): Promise<AdminPayment[]> {
  return apiFetch("/admin/payments/");
}

export async function getAdminPayment(id: string): Promise<AdminPayment> {
  return apiFetch(`/admin/payments/${id}/`);
}

// ── Users ────────────────────────────────────────────────────────────

export async function getAdminUsers(params?: {
  role?: string;
  is_active?: string;
  search?: string;
  page?: number;
}): Promise<Paginated<AdminUser>> {
  return apiFetch(`/admin/users/${buildQuery(params)}`);
}

export async function getAdminUser(id: string): Promise<AdminUser> {
  return apiFetch(`/admin/users/${id}/`);
}

export async function updateAdminUser(
  id: string,
  payload: AdminUserUpdatePayload
): Promise<AdminUser> {
  return apiFetch(`/admin/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ── Stats ────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  return apiFetch("/admin/stats/");
}

