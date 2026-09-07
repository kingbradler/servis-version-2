/**
 * Auth API service — backend integration (Phase 2 Step 2).
 * JWT HttpOnly cookies will be added in Step 3.
 */

import { apiFetch } from "@/lib/api/client";
import { clearUiSession, markUiSession } from "@/lib/session-flag";

import type { AuthUser, LoginPayload, RegisterPayload, UpdateMePayload } from "../types/auth.types";

const AUTH_BASE = "/auth";

export async function registerClient(payload: RegisterPayload): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>(`${AUTH_BASE}/register/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  markUiSession();
  return user;
}

export async function registerSeller(payload: RegisterPayload): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>(`${AUTH_BASE}/register/seller/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  markUiSession();
  return user;
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>(`${AUTH_BASE}/login/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  markUiSession();
  return user;
}

export async function logout(): Promise<{ detail: string }> {
  try {
    return await apiFetch<{ detail: string }>(`${AUTH_BASE}/logout/`, {
      method: "POST",
    });
  } finally {
    clearUiSession();
  }
}

let meInflight: Promise<AuthUser> | null = null;

export async function getMe(): Promise<AuthUser> {
  if (!meInflight) {
    meInflight = apiFetch<AuthUser>(`${AUTH_BASE}/me/`)
      .then((user) => {
        markUiSession();
        return user;
      })
      .finally(() => {
        meInflight = null;
      });
  }
  return meInflight;
}

export async function updateMe(payload: UpdateMePayload): Promise<AuthUser> {
  return apiFetch<AuthUser>(`${AUTH_BASE}/me/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadMyAvatar(file: File): Promise<AuthUser> {
  const form = new FormData();
  form.append("image", file);
  return apiFetch<AuthUser>(`${AUTH_BASE}/me/avatar/`, {
    method: "POST",
    body: form,
  });
}

export async function deleteMyAvatar(): Promise<AuthUser> {
  return apiFetch<AuthUser>(`${AUTH_BASE}/me/avatar/`, {
    method: "DELETE",
  });
}

export async function refreshTokens(): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>(`${AUTH_BASE}/refresh/`, {
    method: "POST",
  });
}

export async function fetchCsrf(): Promise<{ detail: string; csrfToken: string }> {
  return apiFetch<{ detail: string; csrfToken: string }>(`${AUTH_BASE}/csrf/`);
}

export async function verifyEmail(payload: {
  uid: string;
  token: string;
}): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>(`${AUTH_BASE}/verify-email/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  markUiSession();
  return user;
}

export async function resendVerification(email?: string): Promise<{
  detail: string;
  sent?: boolean;
}> {
  return apiFetch<{ detail: string; sent?: boolean }>(
    `${AUTH_BASE}/resend-verification/`,
    {
      method: "POST",
      body: JSON.stringify(email ? { email } : {}),
    }
  );
}

export async function requestPasswordReset(email: string): Promise<{
  detail: string;
}> {
  return apiFetch<{ detail: string }>(`${AUTH_BASE}/password-reset/`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(payload: {
  uid: string;
  token: string;
  password: string;
  password_confirm: string;
}): Promise<AuthUser> {
  const user = await apiFetch<AuthUser>(`${AUTH_BASE}/password-reset/confirm/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  markUiSession();
  return user;
}
