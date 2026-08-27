"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserFacingErrorMessage } from "@/lib/api/errors";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/features/notifications/services/notifications.service";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  ORDER_NEW: "Commande",
  PAYMENT_PROOF: "Paiement",
  PAYMENT_CONFIRMED: "Paiement",
  PAYMENT_REJECTED: "Paiement",
  MESSAGE_NEW: "Message",
  SUB_EXPIRING: "Abonnement",
  SUB_EXPIRED: "Abonnement",
  DISPUTE_OPENED: "Litige",
  DISPUTE_REPLY: "Litige",
  DISPUTE_RESOLVED: "Litige",
  SYSTEM: "Système",
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function NotificationsPanel({
  onUnreadChange,
}: {
  onUnreadChange?: () => void;
}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listNotifications({ page: 1 });
      setItems(data.results);
    } catch (err) {
      setError(getUserFacingErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpen = async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
        );
        onUnreadChange?.();
      } catch {
        /* still navigate */
      }
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      onUnreadChange?.();
    } catch (err) {
      setError(getUserFacingErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">
            Notifications
          </h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Commandes, paiements et messages.
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={markingAll}
            onClick={() => void handleMarkAll()}
          >
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {!loading && !error && items.length === 0 && (
          <EmptyState
            title="Aucune notification"
            description="Vous serez alerté ici pour les nouvelles commandes, preuves de paiement et messages."
            icon={Bell}
          />
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {items.map((n) => {
            const inner = (
              <div
                className={cn(
                  "flex gap-3 px-4 py-3.5 transition-colors",
                  !n.is_read && "bg-primary/[0.04]",
                  n.link && "hover:bg-surface-secondary/80"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.is_read ? "bg-transparent" : "bg-primary"
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "text-body-sm",
                        n.is_read ? "font-medium" : "font-semibold"
                      )}
                    >
                      {n.title}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      {TYPE_LABEL[n.type] ?? n.type}
                    </Badge>
                  </div>
                  {n.body ? (
                    <p className="mt-0.5 text-caption text-text-secondary line-clamp-2">
                      {n.body}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-text-muted">
                    {formatWhen(n.created_at)}
                  </p>
                </div>
              </div>
            );

            return (
              <li key={n.id}>
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => void handleOpen(n)}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => void handleOpen(n)}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
