"use client";

import { useCallback, useEffect, useState } from "react";

import type { StorePublic, PublicStoreFilters } from "../types/store.types";
import * as storesService from "../services/stores.service";

export function usePublicStores(params?: PublicStoreFilters) {
  const [stores, setStores] = useState<StorePublic[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(params ?? {});

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await storesService.getPublicStores(params);
      const list = Array.isArray(data) ? data : data.results;
      setStores(list);
      setCount(Array.isArray(data) ? data.length : data.count);
      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur boutiques");
      setStores([]);
      setCount(0);
      return [];
    } finally {
      setLoading(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    void storesService
      .getPublicStores(params)
      .then((data) => {
        if (cancelled) return;
        setStores(Array.isArray(data) ? data : data.results);
        setCount(Array.isArray(data) ? data.length : data.count);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur boutiques");
        setStores([]);
        setCount(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { stores, count, loading, error, refresh };
}
