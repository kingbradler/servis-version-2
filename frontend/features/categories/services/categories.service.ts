import { apiFetch } from "@/lib/api/client";

import type { Category } from "../types/category.types";

export type CategoryFor = "product" | "service";

export async function fetchCategories(
  parentSlug?: string,
  options?: { for?: CategoryFor }
): Promise<Category[]> {
  const query = new URLSearchParams();
  if (parentSlug) query.set("parent", parentSlug);
  if (options?.for) query.set("for", options.for);
  const qs = query.toString();
  return apiFetch<Category[]>(`/categories/${qs ? `?${qs}` : ""}`);
}

export async function fetchCategory(slug: string): Promise<Category> {
  return apiFetch<Category>(`/categories/${slug}/`);
}
