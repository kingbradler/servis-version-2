import { apiFetch } from "@/lib/api/client";

import type {
  PaginatedServiceRequests,
  ServiceRequest,
  ServiceRequestCreatePayload,
} from "../types/service-request.types";

export async function createServiceRequest(
  payload: ServiceRequestCreatePayload
): Promise<ServiceRequest> {
  return apiFetch<ServiceRequest>("/service-requests/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyServiceRequests(
  page = 1
): Promise<PaginatedServiceRequests> {
  return apiFetch<PaginatedServiceRequests>(
    `/service-requests/?page=${page}`
  );
}

export async function getMyServiceRequest(
  id: string
): Promise<ServiceRequest> {
  return apiFetch<ServiceRequest>(`/service-requests/${id}/`);
}

export async function cancelServiceRequest(
  id: string
): Promise<ServiceRequest> {
  return apiFetch<ServiceRequest>(`/service-requests/${id}/cancel/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getSellerServiceRequests(
  page = 1
): Promise<PaginatedServiceRequests> {
  return apiFetch<PaginatedServiceRequests>(
    `/seller/service-requests/?page=${page}`
  );
}

export async function getSellerServiceRequest(
  id: string
): Promise<ServiceRequest> {
  return apiFetch<ServiceRequest>(`/seller/service-requests/${id}/`);
}

export async function acceptServiceRequest(
  id: string
): Promise<ServiceRequest> {
  return apiFetch<ServiceRequest>(`/seller/service-requests/${id}/accept/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rejectServiceRequest(
  id: string
): Promise<ServiceRequest> {
  return apiFetch<ServiceRequest>(`/seller/service-requests/${id}/reject/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function completeServiceRequest(
  id: string
): Promise<ServiceRequest> {
  return apiFetch<ServiceRequest>(`/seller/service-requests/${id}/complete/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getAdminServiceRequests(
  page = 1
): Promise<PaginatedServiceRequests> {
  return apiFetch<PaginatedServiceRequests>(
    `/admin/service-requests/?page=${page}`
  );
}
