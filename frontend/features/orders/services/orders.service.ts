import { apiFetch } from "@/lib/api/client";

import type {
  CheckoutDelivery,
  CheckoutResponse,
  Order,
  PaginatedOrders,
} from "../types/order.types";

export async function getMyOrders(page = 1): Promise<PaginatedOrders> {
  return apiFetch<PaginatedOrders>(`/orders/?page=${page}`);
}

export async function getMyOrder(id: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${id}/`);
}

export async function checkoutCart(
  delivery: CheckoutDelivery
): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>("/orders/", {
    method: "POST",
    body: JSON.stringify(delivery),
  });
}

export async function getSellerOrders(page = 1): Promise<PaginatedOrders> {
  return apiFetch<PaginatedOrders>(`/seller/orders/?page=${page}`);
}

export async function getSellerOrder(id: string): Promise<Order> {
  return apiFetch<Order>(`/seller/orders/${id}/`);
}
