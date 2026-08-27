"use client";

/**
 * Current user helper — UX only.
 * Backend remains the source of truth for roles and authorization.
 */

import { useCallback, useEffect, useState } from "react";

import type { UserRole } from "@/types";

import type { AuthUser } from "../types/auth.types";
import * as authService from "../services/auth.service";

export function useCurrentUser(options?: { autoLoad?: boolean }) {
  const autoLoad = options?.autoLoad ?? true;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getMe();
      setUser(data);
      return data;
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : "Non authentifié");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    let cancelled = false;
    void authService
      .getMe()
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUser(null);
        setError(err instanceof Error ? err.message : "Non authentifié");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [autoLoad]);

  const role: UserRole | null = user?.role ?? null;

  return {
    user,
    role,
    loading,
    error,
    refresh,
    isAuthenticated: !!user,
    isClient: role === "CLIENT",
    isSeller: role === "SELLER",
    isAdmin: role === "ADMIN",
  };
}
