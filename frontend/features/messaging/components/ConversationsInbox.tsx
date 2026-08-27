"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listConversations,
  type Conversation,
} from "@/features/messaging/api/messaging.api";
import { isApiError } from "@/lib/api/errors";

const POLL_MS = 20_000;

function peerLabel(conversation: Conversation, mode: "client" | "seller") {
  if (mode === "client") {
    return conversation.professional.display_name;
  }
  const first = conversation.client.first_name?.trim() || "";
  const last = conversation.client.last_name?.trim() || "";
  return `${first} ${last}`.trim() || conversation.client.email || "Client";
}

export function ConversationsInbox({
  mode,
  basePath,
}: {
  mode: "client" | "seller";
  basePath: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await listConversations();
      setItems(data.results);
      setError(null);
    } catch (err) {
      if (!opts?.silent) {
        setError(isApiError(err) ? err.message : "Erreur de chargement");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load({ silent: true }), POLL_MS);
    const onFocus = () => void load({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Aucune conversation"
        description={
          mode === "client"
            ? "Contactez un professionnel depuis sa fiche publique."
            : "Les clients pourront vous écrire depuis votre profil."
        }
        actionLabel={mode === "client" ? "Voir les services" : undefined}
        onAction={
          mode === "client" ? () => router.push("/services") : undefined
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((conv) => (
        <li key={conv.id}>
          <Link
            href={`${basePath}/${conv.id}`}
            className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-text-primary">
                  {peerLabel(conv, mode)}
                </p>
                <p className="mt-1 line-clamp-1 text-body-sm text-text-secondary">
                  {conv.last_message?.body || "Aucun message"}
                </p>
                <p className="mt-1 text-caption text-text-muted">
                  {new Date(conv.updated_at).toLocaleString("fr-FR")}
                </p>
              </div>
              {(conv.unread_count ?? 0) > 0 && (
                <Badge variant="primary">{conv.unread_count}</Badge>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
