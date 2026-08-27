"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { sellerNav } from "@/features/dashboard/nav";
import { getConversation } from "@/features/messaging/api/messaging.api";
import { ConversationThread } from "@/features/messaging/components/ConversationThread";
import { isApiError } from "@/lib/api/errors";

function Content() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [title, setTitle] = useState("Conversation");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getConversation(id)
      .then((conv) => {
        if (!cancelled) {
          const first = conv.client.first_name?.trim() || "";
          const last = conv.client.last_name?.trim() || "";
          setTitle(
            `${first} ${last}`.trim() || conv.client.email || "Client"
          );
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(isApiError(err) ? err.message : "Conversation introuvable");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <DashboardShell title="Professionnel" items={sellerNav}>
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/seller/messages">← Messages</Link>
        </Button>
        <h2 className="text-heading-l font-bold tracking-tight">{title}</h2>
        {loading && <Skeleton className="h-64 w-full rounded-xl" />}
        {!loading && error && <ErrorState message={error} />}
        {!loading && !error && <ConversationThread conversationId={id} />}
      </div>
    </DashboardShell>
  );
}

export default function SellerMessageThreadPage() {
  return (
    <RequireAuth roles={["SELLER"]}>
      <Content />
    </RequireAuth>
  );
}
