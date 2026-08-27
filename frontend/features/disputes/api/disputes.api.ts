import { apiFetch } from "@/lib/api/client";

export type DisputeReason =
  | "NOT_RECEIVED"
  | "NOT_AS_DESCRIBED"
  | "NOT_PERFORMED"
  | "PAYMENT_ISSUE"
  | "OTHER";

export type DisputeStatus =
  | "OPEN"
  | "SELLER_REPLIED"
  | "RESOLVED"
  | "CLOSED"
  | "REJECTED";

export interface Dispute {
  id: string;
  order_id: string | null;
  service_request_id: string | null;
  opened_by_email: string;
  reason: DisputeReason;
  description: string;
  seller_reply: string;
  admin_note?: string;
  status: DisputeStatus;
  subject_label: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedDisputes {
  count: number;
  next: string | null;
  previous: string | null;
  results: Dispute[];
}

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  NOT_RECEIVED: "Non reçu / non livré",
  NOT_AS_DESCRIBED: "Non conforme",
  NOT_PERFORMED: "Prestation non réalisée",
  PAYMENT_ISSUE: "Problème de paiement",
  OTHER: "Autre",
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: "Ouvert",
  SELLER_REPLIED: "Réponse reçue",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
  REJECTED: "Rejeté",
};

export async function listMyDisputes(): Promise<PaginatedDisputes> {
  return apiFetch("/disputes/");
}

export async function createDispute(payload: {
  order_id?: string;
  service_request_id?: string;
  reason: DisputeReason;
  description: string;
}): Promise<Dispute> {
  return apiFetch("/disputes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function closeDispute(id: string): Promise<Dispute> {
  return apiFetch(`/disputes/${id}/close/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function listSellerDisputes(): Promise<PaginatedDisputes> {
  return apiFetch("/seller/disputes/");
}

export async function replySellerDispute(
  id: string,
  reply: string
): Promise<Dispute> {
  return apiFetch(`/seller/disputes/${id}/reply/`, {
    method: "POST",
    body: JSON.stringify({ reply }),
  });
}

export async function listAdminDisputes(): Promise<PaginatedDisputes> {
  return apiFetch("/admin/disputes/");
}

export async function resolveAdminDispute(
  id: string,
  payload: { status: "RESOLVED" | "REJECTED" | "CLOSED"; admin_note?: string }
): Promise<Dispute> {
  return apiFetch(`/admin/disputes/${id}/resolve/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
