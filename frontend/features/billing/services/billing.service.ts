import { apiFetch } from "@/lib/api/client";

import type {
  Boost,
  BoostPackage,
  BoostTargetType,
  Entitlements,
  Paginated,
  Plan,
  PlatformPaymentMethod,
  Subscription,
  SubscriptionPayment,
} from "../types/billing.types";

export async function getPlans(category?: string): Promise<Plan[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch(`/billing/plans/${qs}`);
}

export async function getBoostPackages(): Promise<BoostPackage[]> {
  return apiFetch("/billing/boost-packages/");
}

export async function getPlatformPaymentMethods(): Promise<
  PlatformPaymentMethod[]
> {
  return apiFetch("/billing/payment-methods/");
}

export async function getEntitlements(): Promise<Entitlements> {
  return apiFetch("/seller/entitlements/");
}

export async function getMySubscriptions(params?: {
  category?: string;
  status?: string;
}): Promise<Subscription[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  return apiFetch(`/seller/subscriptions/${qs ? `?${qs}` : ""}`);
}

export async function createSubscription(payload: {
  plan_id: string;
  payment_method_id?: string;
}): Promise<Subscription> {
  return apiFetch("/seller/subscriptions/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadSubscriptionProof(
  subscriptionId: string,
  file: File,
  reference?: string
): Promise<SubscriptionPayment> {
  const form = new FormData();
  form.append("proof", file);
  if (reference) form.append("reference", reference);
  return apiFetch(`/seller/subscriptions/${subscriptionId}/proof/`, {
    method: "POST",
    body: form,
  });
}

export async function getMySubscriptionPayments(): Promise<
  SubscriptionPayment[]
> {
  return apiFetch("/seller/subscription-payments/");
}

export async function getMyBoosts(): Promise<Boost[]> {
  return apiFetch("/seller/boosts/");
}

export async function createBoost(payload: {
  package_id: string;
  target_type: BoostTargetType;
  target_id: string;
  payment_method_id: string;
}): Promise<Boost> {
  return apiFetch("/seller/boosts/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadBoostProof(
  boostId: string,
  file: File,
  reference?: string
): Promise<SubscriptionPayment> {
  const form = new FormData();
  form.append("proof", file);
  if (reference) form.append("reference", reference);
  return apiFetch(`/seller/boosts/${boostId}/proof/`, {
    method: "POST",
    body: form,
  });
}

// Admin

export async function getAdminSubscriptions(params?: {
  status?: string;
  category?: string;
  page?: number;
}): Promise<Paginated<Subscription> | Subscription[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.category) query.set("category", params.category);
  if (params?.page) query.set("page", String(params.page));
  const qs = query.toString();
  return apiFetch(`/admin/subscriptions/${qs ? `?${qs}` : ""}`);
}

export async function getAdminSubscriptionPayments(params?: {
  status?: string;
  page?: number;
}): Promise<Paginated<SubscriptionPayment> | SubscriptionPayment[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  const qs = query.toString();
  return apiFetch(`/admin/subscription-payments/${qs ? `?${qs}` : ""}`);
}

export async function approveSubscriptionPayment(
  paymentId: string
): Promise<Subscription> {
  return apiFetch(`/admin/subscription-payments/${paymentId}/approve/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rejectSubscriptionPayment(
  paymentId: string,
  rejection_reason: string
): Promise<SubscriptionPayment> {
  return apiFetch(`/admin/subscription-payments/${paymentId}/reject/`, {
    method: "POST",
    body: JSON.stringify({ rejection_reason }),
  });
}

export async function getAdminBoostPayments(params?: {
  status?: string;
}): Promise<Paginated<SubscriptionPayment> | SubscriptionPayment[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  return apiFetch(`/admin/boost-payments/${qs ? `?${qs}` : ""}`);
}

export async function approveBoostPayment(paymentId: string): Promise<Boost> {
  return apiFetch(`/admin/boost-payments/${paymentId}/approve/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rejectBoostPayment(
  paymentId: string,
  rejection_reason: string
): Promise<SubscriptionPayment> {
  return apiFetch(`/admin/boost-payments/${paymentId}/reject/`, {
    method: "POST",
    body: JSON.stringify({ rejection_reason }),
  });
}

export async function getAdminPlatformPaymentMethods(): Promise<
  (PlatformPaymentMethod & { is_active: boolean; sort_order: number })[]
> {
  return apiFetch("/admin/platform-payment-methods/");
}
