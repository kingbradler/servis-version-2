import { apiFetch } from "@/lib/api/client";
import type { ProfessionalCity } from "./professionals.api";

export type ProfessionalStatus =
  | "DRAFT"
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED";

export interface ProfessionalSeller {
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
  postal_code?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status: ProfessionalStatus;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalCreatePayload {
  display_name: string;
  headline: string;
  bio?: string;
  city: string;
  phone?: string;
  whatsapp?: string;
  avatar?: string;
  cover?: string;
  instagram_url?: string;
  tiktok_url?: string;
  facebook_url?: string;
  address?: string;
  neighborhood?: string;
  postal_code?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export type ProfessionalUpdatePayload = Partial<ProfessionalCreatePayload>;

export async function getSellerProfessional(): Promise<ProfessionalSeller> {
  return apiFetch<ProfessionalSeller>("/seller/professional-profile/");
}

export async function createSellerProfessional(
  payload: ProfessionalCreatePayload
): Promise<ProfessionalSeller> {
  return apiFetch<ProfessionalSeller>("/seller/professional-profile/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSellerProfessional(
  payload: ProfessionalUpdatePayload
): Promise<ProfessionalSeller> {
  return apiFetch<ProfessionalSeller>("/seller/professional-profile/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function submitSellerProfessional(): Promise<ProfessionalSeller> {
  return apiFetch<ProfessionalSeller>("/seller/professional-profile/submit/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
