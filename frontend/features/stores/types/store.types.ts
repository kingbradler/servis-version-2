import type { PublicLocation } from "@/features/map/types";

export type StoreStatus = "DRAFT" | "PENDING" | "ACTIVE" | "SUSPENDED";

export interface StoreCity {
  id: string;
  name: string;
  slug: string;
  region: string;
}

export interface StorePublic {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  banner: string;
  city: StoreCity;
  phone: string;
  whatsapp: string;
  address?: string;
  neighborhood?: string;
  postal_code?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  location?: PublicLocation;
  has_coordinates?: boolean;
  distance_km?: number | null;
  created_at: string;
}

export interface StoreSeller extends StorePublic {
  status: StoreStatus;
  updated_at: string;
}

export interface StoreCreatePayload {
  name: string;
  description?: string;
  city: string;
  phone?: string;
  whatsapp?: string;
  logo?: string;
  banner?: string;
  address?: string;
  neighborhood?: string;
  postal_code?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

export interface StoreUpdatePayload {
  name?: string;
  description?: string;
  city_id?: string;
  phone?: string;
  whatsapp?: string;
  logo?: string;
  banner?: string;
  address?: string;
  neighborhood?: string;
  postal_code?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

export interface PaginatedStores {
  count: number;
  next: string | null;
  previous: string | null;
  results: StorePublic[];
}

export interface PublicStoreFilters {
  city?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface SellerStats {
  store: {
    id: string;
    name: string;
    slug: string;
    status: StoreStatus;
  } | null;
  products_count: number;
  products_active: number;
  orders_count: number;
  orders_pending: number;
  payments_proof_submitted: number;
  payments_confirmed: number;
}

export type SellerAdvancedStatsPeriod = "30d" | "90d" | "all";

export interface SellerAdvancedStats {
  period: SellerAdvancedStatsPeriod;
  currency: string;
  revenue_confirmed: string;
  orders_count: number;
  orders_completed: number;
  avg_order_value: string | null;
  confirmed_order_payments: number;
  payments_proof_submitted: number;
  service_requests_count: number;
  service_requests_completed: number;
  products_active: number;
}
