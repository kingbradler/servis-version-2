export type PlanCategory = "STORE" | "SERVICE";

export type PlanCode =
  | "STORE_FREE"
  | "STORE_STANDARD"
  | "STORE_PRO"
  | "SERVICE_STANDARD"
  | "SERVICE_PRO";

export type SubscriptionStatus =
  | "PENDING"
  | "ACTIVE"
  | "EXPIRED"
  | "REJECTED"
  | "CANCELLED";

export type SubscriptionPaymentStatus =
  | "PENDING"
  | "PROOF_SUBMITTED"
  | "APPROVED"
  | "REJECTED";

export type BoostStatus =
  | "PENDING"
  | "ACTIVE"
  | "EXPIRED"
  | "REJECTED"
  | "CANCELLED";

export type BoostTargetType = "STORE" | "PRODUCT" | "SERVICE";

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  plan_type: PlanCode;
  category: PlanCategory;
  price: string;
  duration_days: number;
  product_limit: number | null;
  product_image_limit: number;
  service_enabled: boolean;
  advanced_stats: boolean;
  visibility_level: number;
  boosts_allowed: boolean;
  sort_order: number;
}

export interface PlatformPaymentMethod {
  id: string;
  name: string;
  account_name: string;
  account_number: string;
  instructions: string;
}

export interface SubscriptionPayment {
  id: string;
  subscription: string;
  amount: string;
  payment_method: PlatformPaymentMethod;
  status: SubscriptionPaymentStatus;
  reference: string;
  proof_url: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string;
  plan_code?: string;
  plan_name?: string;
  created_at: string;
  owner_email?: string;
  owner_phone?: string;
}

export interface Subscription {
  id: string;
  plan: Plan;
  category: PlanCategory;
  status: SubscriptionStatus;
  starts_at: string | null;
  expires_at: string | null;
  activated_at: string | null;
  cancelled_at: string | null;
  days_remaining: number | null;
  latest_payment: SubscriptionPayment | null;
  created_at: string;
  owner_email?: string;
}

export interface StoreEntitlements {
  plan_code: PlanCode;
  plan_name: string;
  product_limit: number | null;
  product_image_limit: number;
  active_product_count: number;
  advanced_stats: boolean;
  visibility_level: number;
  boosts_allowed: boolean;
  subscription_id: string | null;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  days_remaining: number | null;
}

export interface ServiceEntitlements {
  plan_code: PlanCode | null;
  plan_name: string | null;
  has_active_subscription: boolean;
  advanced_stats: boolean;
  visibility_level: number;
  boosts_allowed: boolean;
  subscription_id: string | null;
  status: string | null;
  starts_at: string | null;
  expires_at: string | null;
  days_remaining: number | null;
}

export interface Entitlements {
  store: StoreEntitlements;
  services: ServiceEntitlements;
}

export interface BoostPackage {
  id: string;
  code: string;
  name: string;
  duration_days: number;
  price: string;
}

export interface Boost {
  id: string;
  package: BoostPackage;
  target_type: BoostTargetType;
  target_id: string;
  duration_days: number;
  amount: string;
  status: BoostStatus;
  starts_at: string | null;
  expires_at: string | null;
  payment: SubscriptionPayment | null;
  is_active_now: boolean;
  is_sponsored: boolean;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
