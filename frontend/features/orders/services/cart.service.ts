import { apiFetch } from "@/lib/api/client";

import type { Cart } from "../types/order.types";

export async function getCart(): Promise<Cart> {
  return apiFetch<Cart>("/cart/");
}

export async function addCartItem(
  productId: string,
  quantity = 1
): Promise<Cart> {
  return apiFetch<Cart>("/cart/items/", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function updateCartItem(
  itemId: string,
  quantity: number
): Promise<Cart> {
  return apiFetch<Cart>(`/cart/items/${itemId}/`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  return apiFetch<Cart>(`/cart/items/${itemId}/`, {
    method: "DELETE",
  });
}

export async function clearCart(): Promise<Cart> {
  return apiFetch<Cart>("/cart/", { method: "DELETE" });
}
