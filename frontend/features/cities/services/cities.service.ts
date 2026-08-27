import { apiFetch } from "@/lib/api/client";

import type { City } from "../types/city.types";

export async function fetchCities(): Promise<City[]> {
  return apiFetch<City[]>("/cities/");
}

export async function fetchCity(slug: string): Promise<City> {
  return apiFetch<City>(`/cities/${slug}/`);
}
