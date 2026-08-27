"use client";

import { useCallback, useEffect, useState } from "react";

import { isApiError } from "@/lib/api/errors";

import * as api from "../api/service-requests.api";
import type { ServiceRequest } from "../types/service-request.types";

export function useMyServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getMyServiceRequests();
      setRequests(data.results);
      return data.results;
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
      setRequests([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .getMyServiceRequests()
      .then((data) => {
        if (!cancelled) setRequests(data.results);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : "Erreur de chargement");
        setRequests([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { requests, loading, error, refresh };
}

export function useSellerServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getSellerServiceRequests();
      setRequests(data.results);
      return data.results;
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
      setRequests([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .getSellerServiceRequests()
      .then((data) => {
        if (!cancelled) setRequests(data.results);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : "Erreur de chargement");
        setRequests([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { requests, loading, error, refresh };
}
