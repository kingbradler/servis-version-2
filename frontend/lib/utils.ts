import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency = "MAD"): string {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Normalize a DRF response that may be a paginated `{results}` object or a plain array. */
export function unwrapList<T>(data: T[] | { results: T[] } | null | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.results;
}
