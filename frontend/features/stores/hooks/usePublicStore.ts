"use client";

import { useCallback, useEffect, useState } from "react";

import type { StorePublic } from "../types/store.types";
import * as storesService from "../services/stores.service";

export function usePublicStore(slug: string) {
  const [store, setStore] = useState<StorePublic | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!slug) return null;
    setError(null);
    try {
      const data = await storesService.getPublicStore(slug);
      setStore(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Boutique introuvable");
      setStore(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;
    void storesService
      .getPublicStore(slug)
      .then((data) => {
        if (!cancelled) setStore(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Boutique introuvable");
        setStore(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { store, loading, error, refresh };
}
