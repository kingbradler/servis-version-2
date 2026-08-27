"use client";

import { useCallback, useEffect, useState } from "react";

import type { Cart } from "../types/order.types";
import * as cartService from "../services/cart.service";

export function useCart(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return null;
    }
    setError(null);
    try {
      const data = await cartService.getCart();
      setCart(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur panier");
      setCart(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void cartService
      .getCart()
      .then((data) => {
        if (!cancelled) setCart(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur panier");
        setCart(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const addItem = useCallback(async (productId: string, quantity = 1) => {
    const data = await cartService.addCartItem(productId, quantity);
    setCart(data);
    return data;
  }, []);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    const data = await cartService.updateCartItem(itemId, quantity);
    setCart(data);
    return data;
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const data = await cartService.removeCartItem(itemId);
    setCart(data);
    return data;
  }, []);

  const clear = useCallback(async () => {
    const data = await cartService.clearCart();
    setCart(data);
    return data;
  }, []);

  return {
    cart: enabled ? cart : null,
    loading: enabled ? loading : false,
    error: enabled ? error : null,
    refresh,
    addItem,
    updateItem,
    removeItem,
    clear,
  };
}
