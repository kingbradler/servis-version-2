"use client";

/**
 * Current user helper — UX only.
 * Backend remains the source of truth for roles and authorization.
 */

import { useCallback, useEffect, useState } from "react";

import type { UserRole } from "@/types";

import { isApiError } from "@/lib/api/errors";
import { clearUiSession, hasUiSession, UI_SESSION_EVENT } from "@/lib/session-flag";

import type { AuthUser } from "../types/auth.types";
import * as authService from "../services/auth.service";

export function useCurrentUser(options?: {
  autoLoad?: boolean;
  /** Probe /auth/me even without a UI session flag (protected pages). */
  probeSession?: boolean;
}) {
  const autoLoad = options?.autoLoad ?? true;
  const probeSession = options?.probeSession ?? false;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(
    () =>
      !!autoLoad &&
      (probeSession ||
        (typeof document !== "undefined" && hasUiSession()))
  );
  const [error, setError] = useState<string | null>(null);

  const forgetSession = useCallback((err: unknown) => {
    if (isApiError(err) && err.status === 401) {
      clearUiSession();
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getMe();
      setUser(data);
      return data;
    } catch (err) {
      forgetSession(err);
      setUser(null);
      setError(err instanceof Error ? err.message : "Non authentifié");
      return null;
    } finally {
      setLoading(false);
    }
  }, [forgetSession]);

  useEffect(() => {
    if (!autoLoad) return;
    if (!probeSession && !hasUiSession()) {
      setLoading(false);
      setUser(null);
      return;
    }
    let cancelled = false;
    void authService
      .getMe()
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        forgetSession(err);
        setUser(null);
        setError(err instanceof Error ? err.message : "Non authentifié");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [autoLoad, probeSession, forgetSession]);

  useEffect(() => {
    const onChange = (event: Event) => {
      const on = (event as CustomEvent<boolean>).detail;
      if (on) {
        void refresh();
        return;
      }
      setUser(null);
      setError(null);
      setLoading(false);
    };
    window.addEventListener(UI_SESSION_EVENT, onChange);
    return () => window.removeEventListener(UI_SESSION_EVENT, onChange);
  }, [refresh]);

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
