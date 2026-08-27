import { apiFetch } from "@/lib/api/client";

import type {
  Payment,
  PaymentMethod,
  PaymentMethodCreatePayload,
} from "../types/payment.types";

export async function getOrderPaymentMethods(
  orderId: string
): Promise<PaymentMethod[]> {
  return apiFetch(`/orders/${orderId}/payment-methods/`);
}

export async function getOrderPayment(orderId: string): Promise<Payment> {
  return apiFetch(`/orders/${orderId}/payment/`);
}

export async function createOrderPayment(
  orderId: string,
  paymentMethodId: string
): Promise<Payment> {
  return apiFetch(`/orders/${orderId}/payment/`, {
    method: "POST",
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  });
}

export async function uploadOrderPaymentProof(
  orderId: string,
  file: File
): Promise<Payment> {
  const form = new FormData();
  form.append("proof", file);
  return apiFetch(`/orders/${orderId}/payment/proof/`, {
    method: "POST",
    body: form,
  });
}

export async function getSellerPaymentMethods(): Promise<PaymentMethod[]> {
  return apiFetch("/seller/payment-methods/");
}

export async function createSellerPaymentMethod(
  payload: PaymentMethodCreatePayload
): Promise<PaymentMethod> {
  return apiFetch("/seller/payment-methods/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSellerPaymentMethod(
  id: string,
  payload: Partial<PaymentMethodCreatePayload>
): Promise<PaymentMethod> {
  return apiFetch(`/seller/payment-methods/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteSellerPaymentMethod(id: string): Promise<void> {
  return apiFetch(`/seller/payment-methods/${id}/`, { method: "DELETE" });
}

export async function getSellerOrderPayment(orderId: string): Promise<Payment> {
  return apiFetch(`/seller/orders/${orderId}/payment/`);
}

export async function confirmSellerOrderPayment(
  orderId: string
): Promise<Payment> {
  return apiFetch(`/seller/orders/${orderId}/payment/confirm/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rejectSellerOrderPayment(
  orderId: string,
  reason: string
): Promise<Payment> {
  return apiFetch(`/seller/orders/${orderId}/payment/reject/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function getServiceRequestPaymentMethods(
  requestId: string
): Promise<PaymentMethod[]> {
  return apiFetch(`/service-requests/${requestId}/payment-methods/`);
}

export async function getServiceRequestPayment(
  requestId: string
): Promise<Payment> {
  return apiFetch(`/service-requests/${requestId}/payment/`);
}

export async function createServiceRequestPayment(
  requestId: string,
  paymentMethodId: string
): Promise<Payment> {
  return apiFetch(`/service-requests/${requestId}/payment/`, {
    method: "POST",
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  });
}

export async function uploadServiceRequestPaymentProof(
  requestId: string,
  file: File
): Promise<Payment> {
  const form = new FormData();
  form.append("proof", file);
  return apiFetch(`/service-requests/${requestId}/payment/proof/`, {
    method: "POST",
    body: form,
  });
}

export async function getSellerServiceRequestPayment(
  requestId: string
): Promise<Payment> {
  return apiFetch(`/seller/service-requests/${requestId}/payment/`);
}

export async function confirmSellerServiceRequestPayment(
  requestId: string
): Promise<Payment> {
  return apiFetch(`/seller/service-requests/${requestId}/payment/confirm/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rejectSellerServiceRequestPayment(
  requestId: string,
  reason: string
): Promise<Payment> {
  return apiFetch(`/seller/service-requests/${requestId}/payment/reject/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
