"use client";

import { useCallback, useEffect, useState } from "react";

import * as billingService from "../services/billing.service";
import type { Entitlements } from "../types/billing.types";
import { isApiError } from "@/lib/api/errors";

export function useEntitlements(options?: { autoLoad?: boolean }) {
  const autoLoad = options?.autoLoad ?? true;
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await billingService.getEntitlements();
      setEntitlements(data);
      return data;
    } catch (err) {
      const msg = isApiError(err) ? err.message : "Erreur de chargement";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    let cancelled = false;
    void billingService
      .getEntitlements()
      .then((data) => {
        if (!cancelled) setEntitlements(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [autoLoad]);

  return { entitlements, loading, error, refresh };
}
