"use client";

import { useCallback, useEffect, useState } from "react";

import type { Payment, PaymentMethod } from "../types/payment.types";
import * as paymentsService from "../services/payments.service";

export function useServiceRequestPayment(
  requestId: string,
  enabled = true
) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!requestId || !enabled) return;
    setError(null);
    try {
      const [methodsData, paymentData] = await Promise.all([
        paymentsService.getServiceRequestPaymentMethods(requestId),
        paymentsService.getServiceRequestPayment(requestId).catch(() => null),
      ]);
      setMethods(methodsData);
      setPayment(paymentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur paiement");
    } finally {
      setLoading(false);
    }
  }, [requestId, enabled]);

  useEffect(() => {
    if (!requestId || !enabled) {
      setLoading(false);
      setPayment(null);
      setMethods([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const methodsData =
          await paymentsService.getServiceRequestPaymentMethods(requestId);
        if (cancelled) return;
        setMethods(methodsData);
        try {
          const paymentData =
            await paymentsService.getServiceRequestPayment(requestId);
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
  }, [requestId, enabled]);

  const create = useCallback(
    async (paymentMethodId: string) => {
      const created = await paymentsService.createServiceRequestPayment(
        requestId,
        paymentMethodId
      );
      setPayment(created);
      return created;
    },
    [requestId]
  );

  const uploadProof = useCallback(
    async (file: File) => {
      const updated = await paymentsService.uploadServiceRequestPaymentProof(
        requestId,
        file
      );
      setPayment(updated);
      return updated;
    },
    [requestId]
  );

  return { payment, methods, loading, error, refresh, create, uploadProof };
}
