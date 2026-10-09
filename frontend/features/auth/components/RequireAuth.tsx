"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { LoadingState } from "@/components/ui/loading-state";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { UserRole } from "@/types";

type RequireAuthProps = {
  children: ReactNode;
  /** If set, user must have one of these roles (UX only — API still enforces). */
  roles?: UserRole[];
  /** Where wrong-role users go (default /403). */
  forbiddenHref?: string;
};

/**
 * Client-side route guard. Soft UX only — backend remains authority.
 */
export function RequireAuth({
  children,
  roles,
  forbiddenHref = "/403",
}: RequireAuthProps) {
  const { user, loading, isAuthenticated } = useCurrentUser({
    probeSession: true,
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }
    if (roles && user && !roles.includes(user.role)) {
      router.replace(forbiddenHref);
    }
  }, [loading, isAuthenticated, user, roles, router, pathname, forbiddenHref]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState message="Vérification de la session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState message="Redirection vers la connexion…" />
      </div>
    );
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingState message="Accès refusé…" />
      </div>
    );
  }

  return <>{children}</>;
}
