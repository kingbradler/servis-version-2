"use client";

import { useCallback, useEffect, useState } from "react";

import type { Payment, PaymentMethod } from "../types/payment.types";
import * as paymentsService from "../services/payments.service";

export function useOrderPayment(orderId: string) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    setError(null);
    try {
      const [methodsData, paymentData] = await Promise.all([
        paymentsService.getOrderPaymentMethods(orderId),
        paymentsService.getOrderPayment(orderId).catch(() => null),
      ]);
      setMethods(methodsData);
      setPayment(paymentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur paiement");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const methodsData = await paymentsService.getOrderPaymentMethods(orderId);
        if (cancelled) return;
        setMethods(methodsData);
        try {
          const paymentData = await paymentsService.getOrderPayment(orderId);
          if (!cancelled) setPayment(paymentData);
        } catch {
          if (!cancelled) setPayment(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur paiement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const create = useCallback(
    async (paymentMethodId: string) => {
      const created = await paymentsService.createOrderPayment(
        orderId,
        paymentMethodId
      );
      setPayment(created);
      return created;
    },
    [orderId]
  );

  const uploadProof = useCallback(
    async (file: File) => {
      const updated = await paymentsService.uploadOrderPaymentProof(orderId, file);
      setPayment(updated);
      return updated;
    },
    [orderId]
  );

  return { payment, methods, loading, error, refresh, create, uploadProof };
}
