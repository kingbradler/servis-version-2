/**
 * API client — credentials (HttpOnly cookies) + CSRF double-submit.
 * JWT tokens are never stored in localStorage.
 */

import { env } from "@/config/env";
import { ApiError, messageFromApiBody } from "@/lib/api/errors";
import { hasUiSession, isAuthBootstrapped } from "@/lib/session-flag";

const CSRF_COOKIE_NAME = "csrftoken";
const DEFAULT_TIMEOUT_MS = 45_000;
const UPLOAD_TIMEOUT_MS = 90_000;

export type ApiFetchOptions = RequestInit & { timeoutMs?: number };

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

async function fetchCsrfToken(force = false): Promise<string | null> {
  if (!force) {
    const existing = getCookie(CSRF_COOKIE_NAME);
    if (existing) return existing;
  }

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

function mergeAbortSignals(
  external: AbortSignal | null | undefined,
  timeoutMs: number
): { signal: AbortSignal; cancelTimer: () => void } {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (external) {
    if (external.aborted) {
      ctrl.abort();
    } else {
      external.addEventListener("abort", () => ctrl.abort(), { once: true });
    }
  }
  return { signal: ctrl.signal, cancelTimer: () => clearTimeout(timer) };
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { timeoutMs: timeoutOverride, ...requestInit } = options;
  const url = `${env.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const method = (requestInit.method ?? "GET").toUpperCase();
  const isUnsafe = !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);
  const isUpload =
    typeof FormData !== "undefined" && requestInit.body instanceof FormData;
  const timeoutMs =
    timeoutOverride ?? (isUpload ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

  const headers = new Headers(requestInit.headers);
  if (
    !headers.has("Content-Type") &&
    requestInit.body &&
    !isUpload
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (isUnsafe) {
    const csrf = await fetchCsrfToken();
    if (csrf) {
      headers.set("X-CSRFToken", csrf);
    }
  }

  const run = async (): Promise<Response> => {
    const { signal, cancelTimer } = mergeAbortSignals(
      requestInit.signal,
      timeoutMs
    );
    try {
      return await fetch(url, {
        ...requestInit,
        method,
        credentials: "include",
        headers,
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError(
          "Le serveur met trop de temps à répondre. Réessayez dans un instant.",
          408
        );
      }
      throw err;
    } finally {
      cancelTimer();
    }
  };

  let response: Response;
  try {
    response = await run();
  } catch (err) {
    throw err;
  }

  if (response.status === 403 && isUnsafe) {
    const fresh = await fetchCsrfToken(true);
    if (fresh && fresh !== headers.get("X-CSRFToken")) {
      headers.set("X-CSRFToken", fresh);
      response = await run();
    }
  }

  // Access token expired → try refresh once, then retry
  if (response.status === 401 && !shouldSkipAuthRefresh(path)) {
    const lookingUpSession = path.includes("/auth/me");
    if (lookingUpSession && !hasUiSession() && isAuthBootstrapped()) {
      await throwApiError(response);
    }
    const csrf = await fetchCsrfToken(true);
    const refreshed = await fetch(`${env.apiUrl}/auth/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
    });

    if (refreshed.ok) {
      response = await run();
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
