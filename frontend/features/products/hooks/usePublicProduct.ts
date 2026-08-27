"use client";

import { useCallback, useEffect, useState } from "react";

import type { ProductPublic } from "../types/product.types";
import * as productsService from "../services/products.service";

export function usePublicProduct(storeSlug: string, productSlug: string) {
  const enabled = Boolean(storeSlug && productSlug);
  const [product, setProduct] = useState<ProductPublic | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!storeSlug || !productSlug) return null;
    setError(null);
    try {
      const data = await productsService.getPublicProduct(storeSlug, productSlug);
      setProduct(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Produit introuvable");
      setProduct(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [storeSlug, productSlug]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void productsService
      .getPublicProduct(storeSlug, productSlug)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Produit introuvable");
        setProduct(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, storeSlug, productSlug]);

  return { product, loading, error, refresh };
}
