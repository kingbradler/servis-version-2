"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  PublicServiceFilters,
  ServicePublic,
} from "../types/service.types";
import * as servicesApi from "../api/services.api";

export function usePublicServices(filters?: PublicServiceFilters) {
  const [services, setServices] = useState<ServicePublic[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters ?? {});

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await servicesApi.getPublicServices(filters);
      const list = Array.isArray(data) ? data : data.results;
      setServices(list);
      setCount(Array.isArray(data) ? data.length : data.count);
      return list;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement services");
      setServices([]);
      setCount(0);
      return [];
    } finally {
      setLoading(false);
    }
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps -- filters serialized

  useEffect(() => {
    let cancelled = false;
    void servicesApi
      .getPublicServices(filters)
      .then((data) => {
        if (cancelled) return;
        setServices(Array.isArray(data) ? data : data.results);
        setCount(Array.isArray(data) ? data.length : data.count);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur chargement services");
        setServices([]);
        setCount(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { services, count, loading, error, refresh };
}

export function usePublicService(serviceId: string | undefined) {
  const [service, setService] = useState<ServicePublic | null>(null);
  const [loading, setLoading] = useState(Boolean(serviceId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) {
      return;
    }
    let cancelled = false;
    void servicesApi
      .getPublicService(serviceId)
      .then((data) => {
        if (cancelled) return;
        setService(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Service introuvable");
        setService(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  const refresh = useCallback(async () => {
    if (!serviceId) return;
    setError(null);
    try {
      setService(await servicesApi.getPublicService(serviceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Service introuvable");
      setService(null);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  return { service, loading, error, refresh };
}
