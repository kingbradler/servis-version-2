/**
 * Public server-side fetch (SEO / metadata). No cookies — public endpoints only.
 */

import { env } from "@/config/env";

export async function publicFetch<T>(path: string): Promise<T | null> {
  const url = `${env.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
