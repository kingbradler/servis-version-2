import { apiFetch } from "@/lib/api/client";

export interface MessagingUserBrief {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

export interface MessagingProfessionalBrief {
  id: string;
  display_name: string;
  slug: string;
  avatar?: string;
}

export interface MessageItem {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  is_mine: boolean;
}

export interface Conversation {
  id: string;
  client: MessagingUserBrief;
  professional: MessagingProfessionalBrief;
  last_message: MessageItem | null;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function listConversations(): Promise<Paginated<Conversation>> {
  return apiFetch<Paginated<Conversation>>("/messaging/conversations/");
}

export async function getConversation(
  conversationId: string
): Promise<Conversation> {
  return apiFetch<Conversation>(`/messaging/conversations/${conversationId}/`);
}

export async function startConversation(payload: {
  professional_slug: string;
  message: string;
}): Promise<Conversation> {
  return apiFetch<Conversation>("/messaging/conversations/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listMessages(
  conversationId: string
): Promise<Paginated<MessageItem>> {
  return apiFetch<Paginated<MessageItem>>(
    `/messaging/conversations/${conversationId}/messages/`
  );
}

export async function sendMessage(
  conversationId: string,
  body: string
): Promise<MessageItem> {
  return apiFetch<MessageItem>(
    `/messaging/conversations/${conversationId}/messages/`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    }
  );
}

export async function markConversationRead(
  conversationId: string
): Promise<{ marked_read: number }> {
  return apiFetch<{ marked_read: number }>(
    `/messaging/conversations/${conversationId}/read/`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function getUnreadMessageCount(): Promise<number> {
  const data = await apiFetch<{ unread_count: number }>(
    "/messaging/unread-count/"
  );
  return data.unread_count ?? 0;
}

/** Notify shell/sidebar to refresh the unread badge. */
export function emitMessagesUnreadChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("servis:messages-unread"));
}
