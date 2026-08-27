"use client";

import { useCallback, useEffect, useState } from "react";

import { isApiError } from "@/lib/api/errors";

import * as api from "../api/seller-professional.api";
import type {
  ProfessionalCreatePayload,
  ProfessionalSeller,
  ProfessionalUpdatePayload,
} from "../api/seller-professional.api";

export function useSellerProfessional(options?: { autoLoad?: boolean }) {
  const autoLoad = options?.autoLoad ?? true;
  const [profile, setProfile] = useState<ProfessionalSeller | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSellerProfessional();
      setProfile(data);
      setMissing(false);
      return data;
    } catch (err) {
      setProfile(null);
      const status = isApiError(err) ? err.status : 0;
      if (status === 404) {
        setMissing(true);
        setError(null);
      } else {
        setMissing(false);
        setError(
          isApiError(err) ? err.message : "Erreur profil professionnel"
        );
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    let cancelled = false;
    void api
      .getSellerProfessional()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setMissing(false);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProfile(null);
        const status = isApiError(err) ? err.status : 0;
        if (status === 404) {
          setMissing(true);
          setError(null);
        } else {
          setMissing(false);
          setError(
            isApiError(err) ? err.message : "Erreur profil professionnel"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [autoLoad]);

  const create = useCallback(async (payload: ProfessionalCreatePayload) => {
    const data = await api.createSellerProfessional(payload);
    setProfile(data);
    setMissing(false);
    return data;
  }, []);

  const update = useCallback(async (payload: ProfessionalUpdatePayload) => {
    const data = await api.updateSellerProfessional(payload);
    setProfile(data);
    return data;
  }, []);

  const submit = useCallback(async () => {
    const data = await api.submitSellerProfessional();
    setProfile(data);
    return data;
  }, []);

  return {
    profile,
    loading,
    error,
    missing,
    refresh,
    create,
    update,
    submit,
  };
}
