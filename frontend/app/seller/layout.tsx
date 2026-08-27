"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { sellerNav } from "@/features/dashboard/nav";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth roles={["SELLER"]}>
      <DashboardShell title="Professionnel" items={sellerNav}>
        {children}
      </DashboardShell>
    </RequireAuth>
  );
}
