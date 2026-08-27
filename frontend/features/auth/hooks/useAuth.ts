"use client";

/**
 * Auth hook — session state via /auth/me (HttpOnly cookies).
 */

import { useCallback, useState } from "react";

import type { AuthUser, LoginPayload, RegisterPayload } from "../types/auth.types";
import * as authService from "../services/auth.service";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.getMe();
      setUser(data);
      return data;
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : "Erreur d'authentification");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(payload);
      setUser(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (
      payload: RegisterPayload,
      accountType: "CLIENT" | "SELLER" = "CLIENT"
    ) => {
      setLoading(true);
      setError(null);
      try {
        const data =
          accountType === "SELLER"
            ? await authService.registerSeller(payload)
            : await authService.registerClient(payload);
        setUser(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Inscription impossible");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    fetchMe,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isClient: user?.role === "CLIENT",
    isSeller: user?.role === "SELLER",
    isAdmin: user?.role === "ADMIN",
  };
}
