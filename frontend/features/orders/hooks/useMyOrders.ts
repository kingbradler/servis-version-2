"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  CheckoutDelivery,
  CheckoutResponse,
  Order,
} from "../types/order.types";
import * as ordersService from "../services/orders.service";

export function useMyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await ordersService.getMyOrders();
      setOrders(data.results);
      return data.results;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur commandes");
      setOrders([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ordersService
      .getMyOrders()
      .then((data) => {
        if (!cancelled) setOrders(data.results);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur commandes");
        setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const checkout = useCallback(
    async (delivery: CheckoutDelivery): Promise<CheckoutResponse> => {
      const result = await ordersService.checkoutCart(delivery);
      setOrders((prev) => [...result.orders, ...prev]);
      return result;
    },
    []
  );

  return { orders, loading, error, refresh, checkout };
}
