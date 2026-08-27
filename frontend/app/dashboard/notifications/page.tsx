"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { CLIENT_AREA_ROLES } from "@/features/auth/lib/roles";
import { clientNav } from "@/features/dashboard/nav";
import { NotificationsPanel } from "@/features/notifications/components/NotificationsPanel";
import { useUnreadNotifications } from "@/features/notifications/hooks/useUnreadNotifications";

function Content() {
  const { refresh } = useUnreadNotifications();
  return (
    <DashboardShell title="Client" items={clientNav}>
      <NotificationsPanel onUnreadChange={() => void refresh()} />
    </DashboardShell>
  );
}

export default function ClientNotificationsPage() {
  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      <Content />
    </RequireAuth>
  );
}
