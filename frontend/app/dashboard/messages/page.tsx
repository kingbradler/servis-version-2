"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { CLIENT_AREA_ROLES } from "@/features/auth/lib/roles";
import { clientNav } from "@/features/dashboard/nav";
import { ConversationsInbox } from "@/features/messaging/components/ConversationsInbox";

function Content() {
  return (
    <DashboardShell title="Client" items={clientNav}>
      <div className="space-y-6">
        <div>
          <h2 className="text-heading-l font-bold tracking-tight">Messages</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Échangez avec les professionnels SERVIS.
          </p>
        </div>
        <ConversationsInbox mode="client" basePath="/dashboard/messages" />
      </div>
    </DashboardShell>
  );
}

export default function ClientMessagesPage() {
  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      <Content />
    </RequireAuth>
  );
}
