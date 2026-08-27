"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { adminNav } from "@/features/dashboard/nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth roles={["ADMIN"]}>
      <DashboardShell title="Admin" items={adminNav}>
        {children}
      </DashboardShell>
    </RequireAuth>
  );
}
