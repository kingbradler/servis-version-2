"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useCart } from "@/features/orders/hooks/useCart";
import type { Cart } from "@/features/orders/types/order.types";

interface CartContextValue {
  cart: Cart | null;
  itemsCount: number;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  refresh: () => Promise<Cart | null>;
  addItem: (productId: string, quantity?: number) => Promise<Cart>;
  updateItem: (itemId: string, quantity: number) => Promise<Cart>;
  removeItem: (itemId: string) => Promise<Cart>;
  clear: () => Promise<Cart>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useCurrentUser();
  const cartApi = useCart({ enabled: isAuthenticated && !authLoading });

  const value = useMemo<CartContextValue>(
    () => ({
      cart: cartApi.cart,
      itemsCount: cartApi.cart?.items_count ?? 0,
      loading: authLoading || (isAuthenticated && cartApi.loading),
      error: cartApi.error,
      isAuthenticated,
      authLoading,
      refresh: cartApi.refresh,
      addItem: cartApi.addItem,
      updateItem: cartApi.updateItem,
      removeItem: cartApi.removeItem,
      clear: cartApi.clear,
    }),
    [cartApi, isAuthenticated, authLoading]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCartContext(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCartContext must be used within CartProvider");
  }
  return ctx;
}

/** Safe cart count for Navbar when provider might wrap marketplace only. */
export function useOptionalCartCount(): number {
  const ctx = useContext(CartContext);
  return ctx?.itemsCount ?? 0;
}

export function useOptionalCart(): CartContextValue | null {
  return useContext(CartContext);
}
