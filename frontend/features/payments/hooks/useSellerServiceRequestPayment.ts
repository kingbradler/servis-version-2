"use client";

import { useCallback, useEffect, useState } from "react";

import { isApiError } from "@/lib/api/errors";

import type { Payment } from "../types/payment.types";
import * as paymentsService from "../services/payments.service";

export function useSellerServiceRequestPayment(
  requestId: string,
  enabled = true
) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId || !enabled) {
      setLoading(false);
      setPayment(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void paymentsService
      .getSellerServiceRequestPayment(requestId)
      .then((data) => {
        if (!cancelled) {
          setPayment(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPayment(null);
        if (isApiError(err) && err.status === 404) {
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : "Erreur paiement");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, enabled]);

  const confirm = useCallback(async () => {
    const updated =
      await paymentsService.confirmSellerServiceRequestPayment(requestId);
    setPayment(updated);
    return updated;
  }, [requestId]);

  const reject = useCallback(
    async (reason: string) => {
      const updated = await paymentsService.rejectSellerServiceRequestPayment(
        requestId,
        reason
      );
      setPayment(updated);
      return updated;
    },
    [requestId]
  );

  return { payment, loading, error, confirm, reject };
}
