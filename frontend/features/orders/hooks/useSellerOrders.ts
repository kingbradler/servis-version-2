"use client";

import { useCallback, useEffect, useState } from "react";

import type { Order } from "../types/order.types";
import * as ordersService from "../services/orders.service";

export function useSellerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await ordersService.getSellerOrders();
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
      .getSellerOrders()
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

  return { orders, loading, error, refresh };
}
