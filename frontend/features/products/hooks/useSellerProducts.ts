"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ProductCreatePayload,
  ProductSeller,
  ProductUpdatePayload,
} from "../types/product.types";
import * as productsService from "../services/products.service";

export function useSellerProducts() {
  const [products, setProducts] = useState<ProductSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await productsService.getSellerProducts();
      const list = Array.isArray(data) ? data : data.results;
      setProducts(list);
      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur produits vendeur");
      setProducts([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void productsService
      .getSellerProducts()
      .then((data) => {
        if (cancelled) return;
        setProducts(Array.isArray(data) ? data : data.results);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur produits vendeur");
        setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(async (payload: ProductCreatePayload) => {
    const created = await productsService.createProduct(payload);
    setProducts((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, payload: ProductUpdatePayload) => {
    const updated = await productsService.updateProduct(id, payload);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const archive = useCallback(async (id: string) => {
    const archived = await productsService.archiveProduct(id);
    setProducts((prev) => prev.map((p) => (p.id === id ? archived : p)));
    return archived;
  }, []);

  const publish = useCallback(async (id: string) => {
    const published = await productsService.publishProduct(id);
    setProducts((prev) => prev.map((p) => (p.id === id ? published : p)));
    return published;
  }, []);

  return {
    products,
    loading,
    error,
    refresh,
    create,
    update,
    archive,
    publish,
  };
}
