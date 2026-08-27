import { apiFetch } from "@/lib/api/client";

import type { PublicLocation } from "@/features/map/types";

export interface ProfessionalCity {
  id: string;
  name: string;
  slug: string;
  region: string;
}

export interface ProfessionalPublic {
  id: string;
  display_name: string;
  slug: string;
  headline: string;
  bio: string;
  city: ProfessionalCity;
  phone: string;
  whatsapp: string;
  avatar: string;
  cover: string;
  instagram_url?: string;
  tiktok_url?: string;
  facebook_url?: string;
  address?: string;
  neighborhood?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  location?: PublicLocation;
  has_coordinates?: boolean;
  distance_km?: number | null;
  created_at: string;
}

export interface PublicProfessionalFilters {
  city?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface PaginatedProfessionals {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProfessionalPublic[];
}

export async function getPublicProfessionals(
  params?: PublicProfessionalFilters
): Promise<PaginatedProfessionals | ProfessionalPublic[]> {
  const query = new URLSearchParams();
  if (params?.city) query.set("city", params.city);
  if (params?.search) query.set("search", params.search);
  if (params?.ordering) query.set("ordering", params.ordering);
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.latitude != null) query.set("latitude", String(params.latitude));
  if (params?.longitude != null)
    query.set("longitude", String(params.longitude));
  if (params?.radius != null) query.set("radius", String(params.radius));
  const qs = query.toString();
  return apiFetch(`/professionals/${qs ? `?${qs}` : ""}`);
}

export async function getPublicProfessional(
  slug: string
): Promise<ProfessionalPublic> {
  return apiFetch<ProfessionalPublic>(`/professionals/${slug}/`);
}
