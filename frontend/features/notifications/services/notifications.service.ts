import { apiFetch } from "@/lib/api/client";

export type NotificationType =
  | "ORDER_NEW"
  | "PAYMENT_PROOF"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_REJECTED"
  | "MESSAGE_NEW"
  | "SUB_EXPIRING"
  | "SUB_EXPIRED"
  | "DISPUTE_OPENED"
  | "DISPUTE_REPLY"
  | "DISPUTE_RESOLVED"
  | "SYSTEM";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedNotifications {
  count: number;
  next: string | null;
  previous: string | null;
  results: AppNotification[];
}

export async function listNotifications(opts?: {
  page?: number;
  unread?: boolean;
}): Promise<PaginatedNotifications> {
  const params = new URLSearchParams();
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.unread) params.set("unread", "1");
  const qs = params.toString();
  return apiFetch<PaginatedNotifications>(
    `/notifications/${qs ? `?${qs}` : ""}`
  );
}

export async function getUnreadNotificationCount(): Promise<number> {
  const data = await apiFetch<{ unread_count: number }>(
    "/notifications/unread-count/"
  );
  return data.unread_count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/notifications/${id}/read/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<{ ok: boolean }>("/notifications/mark-all-read/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
