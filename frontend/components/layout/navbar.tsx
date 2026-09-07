"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  Store,
  User as UserIcon,
  X,
} from "lucide-react";

import { ServisLogo } from "@/components/brand/ServisLogo";
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
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { getHomePathForRole } from "@/features/auth/lib/roles";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useOptionalCart } from "@/providers/cart-provider";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Accueil", exact: true },
  { href: "/products", label: "Produits" },
  { href: "/services", label: "Services" },
  { href: "/explore", label: "Explorer" },
];

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const cart = useOptionalCart();
  const { user, isAuthenticated, loading: authLoading } = useCurrentUser();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useLockBodyScroll(mobileOpen);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const cartCount = cart?.itemsCount ?? 0;
  const loginNext = `/login?next=${encodeURIComponent(pathname || "/")}`;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setMobileOpen(false);
    setSearchOpen(false);
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  };

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() ||
      user.email.slice(0, 2).toUpperCase()
    : "";

  const iconBtn =
    "inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.07] text-white/70 transition-all hover:bg-white/12 hover:text-white";

  return (
    <header
      className={cn(
        "sticky top-0 z-[90] w-full max-w-full overflow-x-clip border-b border-white/5 bg-dk/97 backdrop-blur-xl safe-pt",
        className
      )}
    >
      <div className="mx-auto flex h-[62px] max-w-[1200px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6 lg:px-12">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <ServisLogo
            variant="mark"
            tone="on-dark"
            className="shrink-0 text-white sm:hidden"
            markClassName="h-8 w-auto"
            priority
          />
          <ServisLogo
            variant="lockup"
            tone="on-dark"
            className="hidden shrink-0 text-white sm:inline-flex"
            markClassName="h-[34px] w-auto"
            priority
          />
          <nav className="ml-2 hidden items-center gap-1.5 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = isActivePath(pathname, link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-all",
                    active
                      ? "bg-primary text-white"
                      : "bg-white/[0.07] text-white/65 hover:bg-white/12 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(iconBtn, "border-0")}
            aria-label="Rechercher"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-[18px] w-[18px]" />
          </Button>

          {isAuthenticated && (
            <>
              <div className="hidden sm:block">
                <NotificationBell tone="dark" />
              </div>
              <Link
                href="/cart"
                className={cn(iconBtn, "relative")}
                aria-label={`Panier${cartCount > 0 ? `, ${cartCount} article${cartCount > 1 ? "s" : ""}` : ""}`}
              >
                <ShoppingCart className="h-[18px] w-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            </>
          )}

          <div className="hidden sm:block [&_button]:h-10 [&_button]:w-10 [&_button]:rounded-lg [&_button]:bg-white/[0.07] [&_button]:text-white/70 [&_button]:hover:bg-white/12 [&_button]:hover:text-white">
            <ThemeToggle />
          </div>

          {!authLoading && !isAuthenticated && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden rounded-lg bg-white/[0.07] text-white/65 hover:bg-white/12 hover:text-white md:inline-flex"
                asChild
              >
                <Link href="/register">Inscription</Link>
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="hidden rounded-lg md:inline-flex"
                asChild
              >
                <Link href={loginNext}>Connexion</Link>
              </Button>
            </>
          )}

          {!authLoading && isAuthenticated && user && (
            <div className="hidden sm:block">
              <Dropdown>
                <DropdownTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg p-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Menu compte"
                  >
                    <Avatar size="sm">
                      <AvatarFallback className="bg-white/15 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownTrigger>
                <DropdownContent align="end" className="w-56">
                  <DropdownLabel>
                    {user.first_name} {user.last_name}
                  </DropdownLabel>
                  <DropdownSeparator />
                  {user.role === "CLIENT" && (
                    <DropdownItem onSelect={() => router.push("/dashboard")}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownItem>
                  )}
                  {user.role === "SELLER" && (
                    <DropdownItem onSelect={() => router.push("/seller")}>
                      <Store className="mr-2 h-4 w-4" />
                      Espace professionnel
                    </DropdownItem>
                  )}
                  {user.role === "ADMIN" && (
                    <DropdownItem onSelect={() => router.push("/admin")}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      Administration
                    </DropdownItem>
                  )}
                  <DropdownItem onSelect={() => router.push("/cart")}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Panier
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem onSelect={() => void handleLogout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            </div>
          )}

          <button
            type="button"
            className={cn(iconBtn, "lg:hidden")}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <X className="h-[18px] w-[18px]" />
            ) : (
              <Menu className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-[calc(62px+var(--safe-top))] z-[85] bg-dk/55 backdrop-blur-sm lg:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-[86] flex max-h-[min(70vh,520px)] flex-col gap-1 overflow-y-auto border-b border-white/5 bg-dk px-3 py-3 safe-pb lg:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-white/[0.07] px-4 py-3 text-left text-[15px] font-semibold text-white/85"
              >
                {link.label}
              </Link>
            ))}

            {!isAuthenticated && (
              <>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-white/[0.07] px-4 py-3 text-left text-[15px] font-semibold text-white/85"
                >
                  Inscription
                </Link>
                <Link
                  href={loginNext}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-primary px-4 py-3 text-left text-[15px] font-semibold text-white"
                >
                  Connexion
                </Link>
              </>
            )}

            {isAuthenticated && user && (
              <>
                <Link
                  href={getHomePathForRole(user.role)}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-white/[0.07] px-4 py-3 text-left text-[15px] font-semibold text-white/85"
                >
                  Mon espace
                </Link>
                <Link
                  href={
                    user.role === "SELLER"
                      ? "/seller/notifications"
                      : user.role === "ADMIN"
                        ? "/admin/notifications"
                        : "/dashboard/notifications"
                  }
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-white/[0.07] px-4 py-3 text-left text-[15px] font-semibold text-white/85 sm:hidden"
                >
                  Notifications
                </Link>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.07] px-4 py-2.5">
                  <span className="text-[14px] font-semibold text-white/80">
                    Thème
                  </span>
                  <ThemeToggle />
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="rounded-lg bg-white/[0.07] px-4 py-3 text-left text-[15px] font-semibold text-white/85"
                >
                  Déconnexion
                </button>
              </>
            )}
          </div>
        </>
      )}

      <Modal open={searchOpen} onOpenChange={setSearchOpen}>
        <ModalContent className="top-4 translate-y-0" size="md">
          <ModalHeader>
            <ModalTitle>Recherche</ModalTitle>
          </ModalHeader>
          <form onSubmit={submitSearch} className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              autoFocus
              className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Button type="submit" variant="primary">
              OK
            </Button>
          </form>
        </ModalContent>
      </Modal>
    </header>
  );
}
