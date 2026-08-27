"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { X, type LucideIcon } from "lucide-react";

import { ServisLogo } from "@/components/brand/ServisLogo";
import { Button } from "@/components/ui/button";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional badge (e.g. unread messages). */
  badge?: number;
}

export interface SidebarProps {
  items: SidebarItem[];
  open?: boolean;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({
  items,
  open = false,
  onClose,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-dk/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] flex-col bg-dk text-white transition-transform duration-200 safe-pt md:static md:w-[260px] md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/8 px-4">
          <ServisLogo
            href="/"
            variant="lockup"
            tone="on-dark"
            className="text-white"
            markClassName="h-7 w-auto"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <Link
            href="/"
            onClick={onClose}
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-white/55 transition-colors hover:bg-white/6 hover:text-white md:hidden"
          >
            Marketplace
          </Link>
          {items.map((item) => {
            const exact = pathname === item.href;
            const nested =
              item.href !== "/" && pathname.startsWith(`${item.href}/`);
            const isActive = exact || nested;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white shadow-[0_4px_16px_rgba(232,66,8,0.35)]"
                    : "text-white/55 hover:bg-white/6 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {(item.badge ?? 0) > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                      isActive
                        ? "bg-white text-primary"
                        : "bg-primary text-white"
                    )}
                  >
                    {item.badge! > 9 ? "9+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/8 p-4 safe-pb">
          <p className="text-[11px] font-semibold tracking-wide text-white/45">
            SERVIS
          </p>
          <p className="mt-0.5 text-[11px] text-white/25">
            Marketplace · Tanger
          </p>
        </div>
      </aside>
    </>
  );
}
