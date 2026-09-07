"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getPublicProfessionals,
  type ProfessionalPublic,
  type PublicProfessionalFilters,
} from "../api/professionals.api";

export function usePublicProfessionals(params?: PublicProfessionalFilters) {
  const [professionals, setProfessionals] = useState<ProfessionalPublic[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(params ?? {});

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await getPublicProfessionals(params);
      const list = Array.isArray(data) ? data : data.results;
      setProfessionals(list);
      setCount(Array.isArray(data) ? data.length : data.count);
      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur professionnels");
      setProfessionals([]);
      setCount(0);
      return [];
    } finally {
      setLoading(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    void getPublicProfessionals(params)
      .then((data) => {
        if (cancelled) return;
        setProfessionals(Array.isArray(data) ? data : data.results);
        setCount(Array.isArray(data) ? data.length : data.count);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Erreur professionnels"
        );
        setProfessionals([]);
        setCount(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { professionals, count, loading, error, refresh };
}
