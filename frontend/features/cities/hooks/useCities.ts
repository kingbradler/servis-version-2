"use client";

import { useCallback, useEffect, useState } from "react";

import type { City } from "../types/city.types";
import * as citiesService from "../services/cities.service";

export function useCities() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await citiesService.fetchCities();
      setCities(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur villes");
      setCities([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void citiesService
      .fetchCities()
      .then((data) => {
        if (!cancelled) setCities(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur villes");
        setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, loading, error, refresh };
}
