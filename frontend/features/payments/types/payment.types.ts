export type PaymentMethodType =
  | "MOBILE_MONEY"
  | "BANK_TRANSFER"
  | "CASH"
  | "OTHER";

export type PaymentStatus =
  | "PENDING"
  | "PROOF_SUBMITTED"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED";

export type PaymentProofStatus =
  | "SUBMITTED"
  | "ACCEPTED"
  | "REJECTED"
  | "SUPERSEDED";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  label: string;
  account_name: string;
  account_number: string;
  instructions: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentProof {
  id: string;
  file_url: string;
  uploaded_at: string;
  status: PaymentProofStatus;
  rejection_reason: string;
}

export interface Payment {
  id: string;
  order_id: string | null;
  service_request_id?: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  proof: string;
  proof_uploaded_at: string | null;
  seller_reviewed_at: string | null;
  seller_rejection_reason: string;
  proofs: PaymentProof[];
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodCreatePayload {
  type: PaymentMethodType;
  label: string;
  account_name: string;
  account_number?: string;
  instructions?: string;
  is_active?: boolean;
}
