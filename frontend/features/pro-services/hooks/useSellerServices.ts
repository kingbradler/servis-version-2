"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  ServiceCreatePayload,
  ServiceSeller,
  ServiceUpdatePayload,
} from "../types/service.types";
import * as servicesApi from "../api/services.api";
import { getUserFacingErrorMessage } from "@/lib/api/errors";

export function useSellerServices() {
  const [services, setServices] = useState<ServiceSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await servicesApi.getSellerServices();
      const list = Array.isArray(data) ? data : data.results;
      setServices(list);
      return list;
    } catch (err) {
      setError(getUserFacingErrorMessage(err, "Impossible de charger vos services."));
      setServices([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void servicesApi
      .getSellerServices()
      .then((data) => {
        if (cancelled) return;
        setServices(Array.isArray(data) ? data : data.results);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          getUserFacingErrorMessage(err, "Impossible de charger vos services.")
        );
        setServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(async (payload: ServiceCreatePayload) => {
    const created = await servicesApi.createService(payload);
    setServices((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: string, payload: ServiceUpdatePayload) => {
    const updated = await servicesApi.updateService(id, payload);
    setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  const archive = useCallback(async (id: string) => {
    const archived = await servicesApi.archiveService(id);
    setServices((prev) => prev.map((s) => (s.id === id ? archived : s)));
    return archived;
  }, []);

  const publish = useCallback(async (id: string) => {
    const published = await servicesApi.publishService(id);
    setServices((prev) => prev.map((s) => (s.id === id ? published : s)));
    return published;
  }, []);

  return {
    services,
    loading,
    error,
    refresh,
    create,
    update,
    archive,
    publish,
  };
}
