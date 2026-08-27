export type ProductStatus =
  | "DRAFT"
  | "ACTIVE"
  | "OUT_OF_STOCK"
  | "ARCHIVED";

export interface ProductStoreRef {
  name: string;
  slug: string;
}

export interface ProductCategoryRef {
  name: string;
  slug: string;
}

export interface ProductImage {
  id: string;
  image: string;
  alt_text: string;
  order: number;
  created_at: string;
}

export interface ProductPublic {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  compare_price: string | null;
  stock: number;
  status: ProductStatus;
  is_featured: boolean;
  is_boosted?: boolean;
  sponsored_label?: string | null;
  store: ProductStoreRef;
  category: ProductCategoryRef | null;
  images: ProductImage[];
  video_url?: string;
  created_at: string;
}

export interface ProductSeller extends Omit<ProductPublic, "store" | "category"> {
  category: ProductCategoryRef | null;
  store_slug: string;
  store_name: string;
  store_status: string;
  updated_at: string;
}

export interface ProductCreatePayload {
  name: string;
  description?: string;
  category?: string | null;
  price: string | number;
  compare_price?: string | number | null;
  stock?: number;
  is_featured?: boolean;
  image_urls?: string[];
}

export interface ProductUpdatePayload {
  name?: string;
  description?: string;
  category_id?: string | null;
  price?: string | number;
  compare_price?: string | number | null;
  stock?: number;
  is_featured?: boolean;
  video_url?: string;
}

export interface PublicProductFilters {
  city?: string;
  category?: string;
  store?: string;
  min_price?: string | number;
  max_price?: string | number;
  search?: string;
  featured?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedProducts<T = ProductPublic> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
