"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useUnreadNotifications } from "@/features/notifications/hooks/useUnreadNotifications";
import { cn } from "@/lib/utils";

function notificationsPath(role: string | null | undefined): string {
  if (role === "SELLER") return "/seller/notifications";
  if (role === "ADMIN") return "/admin/notifications";
  return "/dashboard/notifications";
}

export function NotificationBell({
  className,
  tone = "light",
}: {
  className?: string;
  /** Marketplace navbar is dark; dashboards are light. */
  tone?: "light" | "dark";
}) {
  const { user, isAuthenticated } = useCurrentUser();
  const { count } = useUnreadNotifications();

  if (!isAuthenticated || !user) return null;

  const href = notificationsPath(user.role);
  const dark = tone === "dark";

  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all",
        dark
          ? "bg-white/[0.07] text-white/70 hover:bg-white/12 hover:text-white"
          : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
        className
      )}
      aria-label={
        count > 0
          ? `Notifications, ${count} non lue${count > 1 ? "s" : ""}`
          : "Notifications"
      }
      title="Notifications"
    >
      <Bell className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
