export type UserRole = "CLIENT" | "SELLER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  avatar: string;
  is_verified: boolean;
  /** CLIENT | SELLER — can use cart / product orders. */
  can_shop?: boolean;
  has_store?: boolean;
  has_professional_profile?: boolean;
  created_at: string;
  updated_at: string;
}

export type StoreStatus = "DRAFT" | "PENDING" | "ACTIVE" | "SUSPENDED";

export type ProductStatus = "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus =
  | "AWAITING"
  | "PROOF_SUBMITTED"
  | "VERIFIED"
  | "REJECTED"
  | "REFUNDED";

export type PaymentMethod = "BANK_TRANSFER";
