"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  emitMessagesUnreadChanged,
  listMessages,
  markConversationRead,
  sendMessage,
  type MessageItem,
} from "@/features/messaging/api/messaging.api";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const POLL_MS = 12_000;

export function ConversationThread({
  conversationId,
}: {
  conversationId: string;
}) {
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const stickToBottom = useRef(true);

  const syncMessages = useCallback(
    async (opts?: { silent?: boolean; markRead?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await listMessages(conversationId);
        setMessages((prev) => {
          if (
            opts?.silent &&
            prev.length === data.results.length &&
            prev.at(-1)?.id === data.results.at(-1)?.id
          ) {
            return prev;
          }
          return data.results;
        });
        setError(null);
        if (opts?.markRead !== false) {
          await markConversationRead(conversationId);
          emitMessagesUnreadChanged();
        }
      } catch (err) {
        if (!opts?.silent) {
          setError(isApiError(err) ? err.message : "Erreur de chargement");
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [conversationId]
  );

  useEffect(() => {
    void syncMessages();
    const id = window.setInterval(
      () => void syncMessages({ silent: true }),
      POLL_MS
    );
    const onFocus = () => void syncMessages({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncMessages]);

  useEffect(() => {
    if (stickToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    stickToBottom.current = true;
    try {
      const msg = await sendMessage(conversationId, text);
      setMessages((prev) => [...prev, msg]);
      setBody("");
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Envoi impossible",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-2/3 rounded-xl" />
        <Skeleton className="ml-auto h-16 w-1/2 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={() => void syncMessages()} />
    );
  }

  return (
    <div className="flex h-[min(70vh,560px)] flex-col rounded-xl border border-border bg-surface">
      <div
        className="flex-1 space-y-3 overflow-y-auto p-4"
        onScroll={(e) => {
          const el = e.currentTarget;
          const nearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          stickToBottom.current = nearBottom;
        }}
      >
        {messages.length === 0 ? (
          <p className="text-body-sm text-text-muted">
            Aucun message pour le moment.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-body-sm",
                msg.is_mine
                  ? "ml-auto bg-primary text-white"
                  : "bg-cr2 text-text-primary dark:bg-border"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.body}</p>
              <p
                className={cn(
                  "mt-1 text-[11px]",
                  msg.is_mine ? "text-white/70" : "text-text-muted"
                )}
              >
                {new Date(msg.created_at).toLocaleString("fr-FR")}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Écrire un message…"
          maxLength={4000}
          disabled={sending}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-body text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <Button type="submit" variant="primary" loading={sending}>
          Envoyer
        </Button>
      </form>
    </div>
  );
}
