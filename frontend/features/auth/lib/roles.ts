import type { User, UserRole } from "@/types";

/**
 * Frontend role helpers — UX only.
 * Never rely on these for security; always enforce roles on the API.
 */

/** Roles allowed on /dashboard/* (shopping + service requests). */
export const CLIENT_AREA_ROLES: UserRole[] = ["CLIENT", "SELLER"];

export function canAccessClientDashboard(
  role: UserRole | null | undefined
): boolean {
  return role === "CLIENT" || role === "SELLER" || role === "ADMIN";
}

export function canAccessSellerArea(role: UserRole | null | undefined): boolean {
  return role === "SELLER";
}

export function canAccessAdminArea(role: UserRole | null | undefined): boolean {
  return role === "ADMIN";
}

export function getHomePathForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case "SELLER":
      return "/seller";
    case "ADMIN":
      return "/admin";
    case "CLIENT":
      return "/dashboard";
    default:
      return "/";
  }
}

/** Soft migration: SELLER = Professionnel. */
export function getRoleLabel(role: UserRole | null | undefined): string {
  switch (role) {
    case "SELLER":
      return "Professionnel";
    case "ADMIN":
      return "Administrateur";
    case "CLIENT":
      return "Client";
    default:
      return "Visiteur";
  }
}

export function canShop(user: User | null | undefined): boolean {
  if (!user) return false;
  if (typeof user.can_shop === "boolean") return user.can_shop;
  return user.role === "CLIENT" || user.role === "SELLER";
}

export function isSafeNextPath(next: string | null | undefined): boolean {
  if (!next || next === "/") return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("://")) return false;
  return true;
}

/**
 * Post-login destination: honor `?next=` when safe and role-compatible.
 */
export function resolvePostLoginPath(
  role: UserRole | null | undefined,
  nextParam: string | null | undefined
): string {
  if (!isSafeNextPath(nextParam)) {
    return getHomePathForRole(role);
  }
  const next = nextParam as string;
  if (next.startsWith("/seller") && !canAccessSellerArea(role)) {
    return getHomePathForRole(role);
  }
  if (next.startsWith("/admin") && !canAccessAdminArea(role)) {
    return getHomePathForRole(role);
  }
  return next;
}
