"use client";

import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { NotificationsPanel } from "@/features/notifications/components/NotificationsPanel";
import { useUnreadNotifications } from "@/features/notifications/hooks/useUnreadNotifications";

function Content() {
  const { refresh } = useUnreadNotifications();
  return <NotificationsPanel onUnreadChange={() => void refresh()} />;
}

export default function AdminNotificationsPage() {
  return (
    <RequireAuth roles={["ADMIN"]}>
      <Content />
    </RequireAuth>
  );
}
