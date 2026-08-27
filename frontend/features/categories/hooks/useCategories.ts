"use client";

import { useCallback, useEffect, useState } from "react";

import type { Category } from "../types/category.types";
import * as categoriesService from "../services/categories.service";
import type { CategoryFor } from "../services/categories.service";

export function useCategories(
  parentSlug?: string,
  options?: { for?: CategoryFor }
) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const forParam = options?.for;

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await categoriesService.fetchCategories(parentSlug, {
        for: forParam,
      });
      setCategories(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur catégories");
      setCategories([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [parentSlug, forParam]);

  useEffect(() => {
    let cancelled = false;
    void categoriesService
      .fetchCategories(parentSlug, { for: forParam })
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur catégories");
        setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentSlug, forParam]);

  return { categories, loading, error, refresh };
}
