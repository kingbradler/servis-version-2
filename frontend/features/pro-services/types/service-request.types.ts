export type ServiceRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export interface ServiceRequestServiceBrief {
  id: string;
  name: string;
  slug: string;
  price?: string | null;
  price_type: string;
}

export interface ServiceRequestProfessionalBrief {
  id: string;
  display_name: string;
  slug: string;
  phone: string;
  whatsapp: string;
  city_name?: string;
}

export interface ServiceRequestClientBrief {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface ServiceRequest {
  id: string;
  service: ServiceRequestServiceBrief;
  client: ServiceRequestClientBrief;
  professional: ServiceRequestProfessionalBrief;
  status: ServiceRequestStatus;
  message: string;
  requested_date: string | null;
  requested_time: string | null;
  address: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestCreatePayload {
  service: string;
  message: string;
  requested_date?: string | null;
  requested_time?: string | null;
  address: string;
  phone: string;
}

export interface PaginatedServiceRequests {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceRequest[];
}

export const SERVICE_REQUEST_STATUS_LABELS: Record<
  ServiceRequestStatus,
  string
> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
  COMPLETED: "Terminée",
};

export const SERVICE_REQUEST_STATUS_VARIANTS: Record<
  ServiceRequestStatus,
  "warning" | "secondary" | "success" | "error" | "default"
> = {
  PENDING: "warning",
  ACCEPTED: "secondary",
  REJECTED: "error",
  CANCELLED: "default",
  COMPLETED: "success",
};
