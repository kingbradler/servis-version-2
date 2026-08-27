export type ServiceStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type ServicePriceType = "FIXED" | "FROM" | "QUOTE";

export interface ServiceCategoryRef {
  name: string;
  slug: string;
}

export interface ServiceImage {
  id: string;
  image: string;
  alt_text: string;
  order: number;
  created_at: string;
}

export interface ServiceProfessionalRef {
  id: string;
  display_name: string;
  slug: string;
  headline: string;
  phone: string;
  whatsapp: string;
  avatar: string;
  city_name: string;
  city_slug: string;
  address?: string;
  neighborhood?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  location?: {
    address: string;
    city: string | null;
    neighborhood: string;
    postal_code: string;
    latitude: number | null;
    longitude: number | null;
  };
  has_coordinates?: boolean;
}

export interface ServicePublic {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string | null;
  price_type: ServicePriceType;
  duration: string;
  is_featured: boolean;
  is_boosted?: boolean;
  sponsored_label?: string | null;
  professional: ServiceProfessionalRef;
  category: ServiceCategoryRef | null;
  images: ServiceImage[];
  primary_image: string | null;
  distance_km?: number | null;
  created_at: string;
}

export interface ServiceSeller {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string | null;
  price_type: ServicePriceType;
  duration: string;
  status: ServiceStatus;
  is_featured: boolean;
  category: ServiceCategoryRef | null;
  images: ServiceImage[];
  profile_status: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCreatePayload {
  name: string;
  description?: string;
  category?: string | null;
  price?: string | number | null;
  price_type?: ServicePriceType;
  duration?: string;
  is_featured?: boolean;
}

export interface ServiceUpdatePayload {
  name?: string;
  description?: string;
  category_id?: string | null;
  price?: string | number | null;
  price_type?: ServicePriceType;
  duration?: string;
  is_featured?: boolean;
}

export interface PublicServiceFilters {
  city?: string;
  category?: string;
  min_price?: string | number;
  max_price?: string | number;
  price_type?: ServicePriceType;
  search?: string;
  featured?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface PaginatedServices<T = ServicePublic> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
