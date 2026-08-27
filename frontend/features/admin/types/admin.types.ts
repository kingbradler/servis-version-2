import type { OrderStatus, OrderStoreRef, OrderItem } from "@/features/orders/types/order.types";
import type { Payment } from "@/features/payments/types/payment.types";
import type { ProductCategoryRef, ProductImage, ProductStatus } from "@/features/products/types/product.types";
import type { StoreCity, StoreStatus } from "@/features/stores/types/store.types";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AdminStore {
  id: string;
  owner_id: string;
  owner_email: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  banner: string;
  city: StoreCity;
  status: StoreStatus;
  phone: string;
  whatsapp: string;
  created_at: string;
  updated_at: string;
}

export interface AdminProductStoreRef {
  name: string;
  slug: string;
}

export interface AdminProduct {
  id: string;
  store: AdminProductStoreRef;
  store_id: string;
  owner_email: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  compare_price: string | null;
  stock: number;
  status: ProductStatus;
  is_featured: boolean;
  category: ProductCategoryRef | null;
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  parent: string | null;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface AdminCategoryPayload {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  parent?: string | null;
  is_active?: boolean;
  order?: number;
}

export interface AdminOrder {
  id: string;
  store: OrderStoreRef;
  store_name_snapshot: string;
  status: OrderStatus;
  total_amount: string;
  items: OrderItem[];
  user_id: string;
  user_email: string;
  created_at: string;
  updated_at: string;
}

export type AdminPayment = Payment;

export type UserRole = "CLIENT" | "SELLER" | "ADMIN";

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  avatar: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserUpdatePayload {
  is_active?: boolean;
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface AdminStats {
  users_count: number;
  users_active: number;
  users_by_role: {
    CLIENT: number;
    SELLER: number;
    ADMIN: number;
  };
  stores_count: number;
  stores_by_status: {
    DRAFT: number;
    PENDING: number;
    ACTIVE: number;
    SUSPENDED: number;
  };
  products_count: number;
  products_active: number;
  orders_count: number;
  orders_pending: number;
  payments_count: number;
  payments_proof_submitted: number;
  payments_confirmed: number;
}

