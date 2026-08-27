"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LogOut, Menu } from "lucide-react";

import { Sidebar, type SidebarItem } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { getHomePathForRole } from "@/features/auth/lib/roles";
import { useUnreadMessages } from "@/features/messaging/hooks/useUnreadMessages";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

function withMessageBadges(
  items: SidebarItem[],
  unreadMessages: number
): SidebarItem[] {
  if (unreadMessages <= 0) return items;
  return items.map((item) =>
    item.href.includes("/messages")
      ? { ...item, badge: unreadMessages }
      : item
  );
}

export function DashboardShell({
  title,
  items,
  children,
  className,
}: {
  title: string;
  items: SidebarItem[];
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUser();
  const { logout } = useAuth();
  const router = useRouter();
  const { count: unreadMessages } = useUnreadMessages();
  const navItems = withMessageBadges(items, unreadMessages);

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() ||
      user.email.slice(0, 2).toUpperCase()
    : "?";

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <div
      className={cn(
        "flex min-h-full bg-background text-text-primary",
        className
      )}
    >
      <Sidebar items={navItems} open={open} onClose={() => setOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-cr2 bg-surface/95 px-3 backdrop-blur safe-pt dark:border-border sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 md:hidden"
              aria-label="Ouvrir le menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Espace
              </p>
              <h1 className="font-display text-[15px] font-extrabold leading-tight text-text-primary">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden rounded-xl sm:inline-flex"
            >
              <Link href="/">Marketplace</Link>
            </Button>
            <NotificationBell tone="light" />
            <ThemeToggle />
            {user && (
              <Dropdown>
                <DropdownTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl p-1 hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Menu compte"
                  >
                    <Avatar size="sm">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownTrigger>
                <DropdownContent align="end" className="w-52">
                  <DropdownLabel>
                    {user.first_name} {user.last_name}
                  </DropdownLabel>
                  <DropdownSeparator />
                  <DropdownItem
                    onSelect={() =>
                      router.push(getHomePathForRole(user.role))
                    }
                  >
                    Mon espace
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem onSelect={() => void handleLogout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden p-3 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
