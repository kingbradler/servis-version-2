/**
 * API client — credentials (HttpOnly cookies) + CSRF double-submit.
 * JWT tokens are never stored in localStorage.
 */

import { env } from "@/config/env";
import { ApiError, messageFromApiBody } from "@/lib/api/errors";
import { hasUiSession, isAuthBootstrapped } from "@/lib/session-flag";

const CSRF_COOKIE_NAME = "csrftoken";

/** Auth paths that must not trigger silent token refresh. */
function shouldSkipAuthRefresh(path: string): boolean {
  const p = path.startsWith("/") ? path : `/${path}`;
  return (
    p.startsWith("/auth/login") ||
    p.startsWith("/auth/logout") ||
    p.startsWith("/auth/refresh") ||
    p.startsWith("/auth/register") ||
    p.startsWith("/auth/csrf")
  );
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfCookie(): Promise<string | null> {
  const existing = getCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;

  const response = await fetch(`${env.apiUrl}/auth/csrf/`, {
    method: "GET",
    credentials: "include",
  });
  if (response.ok) {
    const body = (await response.json().catch(() => null)) as {
      csrfToken?: string;
    } | null;
    if (body?.csrfToken) return body.csrfToken;
  }
  return getCookie(CSRF_COOKIE_NAME);
}

async function throwApiError(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(
    messageFromApiBody(body, response.status),
    response.status,
    body
  );
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${env.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const method = (options.method ?? "GET").toUpperCase();
  const isUnsafe = !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);

  const headers = new Headers(options.headers);
  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(typeof FormData !== "undefined" && options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (isUnsafe) {
    const csrf = await ensureCsrfCookie();
    if (csrf) {
      headers.set("X-CSRFToken", csrf);
    }
  }

  const response = await fetch(url, {
    ...options,
    method,
    credentials: "include",
    headers,
  });

  // Access token expired → try refresh once, then retry
  // Allow refresh for /auth/me/ (and other non-auth-mutating paths)
  if (response.status === 401 && !shouldSkipAuthRefresh(path)) {
    const lookingUpSession = path.includes("/auth/me");
    // Skip refresh only after this tab already learned the visitor is a guest.
    if (lookingUpSession && !hasUiSession() && isAuthBootstrapped()) {
      await throwApiError(response);
    }
    const csrf = await ensureCsrfCookie();
    const refreshed = await fetch(`${env.apiUrl}/auth/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
    });

    if (refreshed.ok) {
      const retry = await fetch(url, {
        ...options,
        method,
        credentials: "include",
        headers,
      });
      if (!retry.ok) {
        await throwApiError(retry);
      }
      if (retry.status === 204) {
        return undefined as T;
      }
      return retry.json() as Promise<T>;
    }
  }

  if (!response.ok) {
    await throwApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
