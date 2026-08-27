"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingState } from "@/components/ui/loading-state";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { CLIENT_AREA_ROLES } from "@/features/auth/lib/roles";

function CartRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cart");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingState message="Redirection vers le panier…" />
    </div>
  );
}

export default function DashboardCartPage() {
  return (
    <RequireAuth roles={CLIENT_AREA_ROLES}>
      <CartRedirect />
    </RequireAuth>
  );
}
