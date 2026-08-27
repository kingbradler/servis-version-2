"use client";

import { useCallback, useEffect, useState } from "react";

import type { Payment } from "../types/payment.types";
import * as paymentsService from "../services/payments.service";

export function useSellerOrderPayment(orderId: string) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    void paymentsService
      .getSellerOrderPayment(orderId)
      .then((data) => {
        if (!cancelled) setPayment(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur paiement");
        setPayment(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const confirm = useCallback(async () => {
    const updated = await paymentsService.confirmSellerOrderPayment(orderId);
    setPayment(updated);
    return updated;
  }, [orderId]);

  const reject = useCallback(
    async (reason: string) => {
      const updated = await paymentsService.rejectSellerOrderPayment(
        orderId,
        reason
      );
      setPayment(updated);
      return updated;
    },
    [orderId]
  );

  return { payment, loading, error, confirm, reject };
}
