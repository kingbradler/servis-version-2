"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  PaymentMethod,
  PaymentMethodCreatePayload,
} from "../types/payment.types";
import * as paymentsService from "../services/payments.service";

export function useSellerPaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await paymentsService.getSellerPaymentMethods();
      setMethods(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur moyens de paiement");
      setMethods([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void paymentsService
      .getSellerPaymentMethods()
      .then((data) => {
        if (!cancelled) setMethods(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur moyens de paiement");
        setMethods([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(async (payload: PaymentMethodCreatePayload) => {
    const created = await paymentsService.createSellerPaymentMethod(payload);
    setMethods((prev) => [...prev, created]);
    return created;
  }, []);

  const update = useCallback(
    async (id: string, payload: Partial<PaymentMethodCreatePayload>) => {
      const updated = await paymentsService.updateSellerPaymentMethod(id, payload);
      setMethods((prev) => prev.map((m) => (m.id === id ? updated : m)));
      return updated;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await paymentsService.deleteSellerPaymentMethod(id);
    setMethods((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { methods, loading, error, refresh, create, update, remove };
}
