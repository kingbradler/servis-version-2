"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { sellerNav } from "@/features/dashboard/nav";
import { ConversationsInbox } from "@/features/messaging/components/ConversationsInbox";

function Content() {
  return (
    <DashboardShell title="Professionnel" items={sellerNav}>
      <div className="space-y-6">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">Messages</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Répondez aux clients qui vous contactent.
          </p>
        </div>
        <ConversationsInbox mode="seller" basePath="/seller/messages" />
      </div>
    </DashboardShell>
  );
}

export default function SellerMessagesPage() {
  return (
    <RequireAuth roles={["SELLER"]}>
      <Content />
    </RequireAuth>
  );
}
