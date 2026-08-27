"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  StoreCreatePayload,
  StoreSeller,
  StoreUpdatePayload,
} from "../types/store.types";
import * as storesService from "../services/stores.service";

export function useSellerStore(options?: { autoLoad?: boolean }) {
  const autoLoad = options?.autoLoad ?? false;
  const [store, setStore] = useState<StoreSeller | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await storesService.getSellerStore();
      setStore(data);
      return data;
    } catch (err) {
      setStore(null);
      setError(err instanceof Error ? err.message : "Pas de boutique");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    let cancelled = false;
    void storesService
      .getSellerStore()
      .then((data) => {
        if (!cancelled) setStore(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStore(null);
        setError(err instanceof Error ? err.message : "Pas de boutique");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [autoLoad]);

  const create = useCallback(async (payload: StoreCreatePayload) => {
    const data = await storesService.createSellerStore(payload);
    setStore(data);
    return data;
  }, []);

  const update = useCallback(async (payload: StoreUpdatePayload) => {
    const data = await storesService.updateSellerStore(payload);
    setStore(data);
    return data;
  }, []);

  const submit = useCallback(async () => {
    const data = await storesService.submitSellerStore();
    setStore(data);
    return data;
  }, []);

  return { store, loading, error, refresh, create, update, submit };
}
