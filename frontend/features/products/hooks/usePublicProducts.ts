"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ProductPublic,
  PublicProductFilters,
} from "../types/product.types";
import * as productsService from "../services/products.service";

export function usePublicProducts(filters?: PublicProductFilters) {
  const [products, setProducts] = useState<ProductPublic[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters ?? {});

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await productsService.getPublicProducts(filters);
      const list = Array.isArray(data) ? data : data.results;
      setProducts(list);
      setCount(Array.isArray(data) ? data.length : data.count);
      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur produits");
      setProducts([]);
      setCount(0);
      return [];
    } finally {
      setLoading(false);
    }
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps -- filters serialized

  useEffect(() => {
    let cancelled = false;
    void productsService
      .getPublicProducts(filters)
      .then((data) => {
        if (cancelled) return;
        setProducts(Array.isArray(data) ? data : data.results);
        setCount(Array.isArray(data) ? data.length : data.count);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur produits");
        setProducts([]);
        setCount(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { products, count, loading, error, refresh };
}
