import {
  Bell,
  ClipboardList,
  CreditCard,
  FolderTree,
  Image as ImageIcon,
  BarChart3,
  LayoutDashboard,
  MessageSquare,
  Package,
  Scale,
  ShoppingBag,
  Star,
  Store,
  User,
  Users,
  Wallet,
  Wrench,
  Sparkles,
} from "lucide-react";

import type { SidebarItem } from "@/components/layout/sidebar";

export const clientNav: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Profil", href: "/dashboard/profile", icon: User },
  { label: "Commandes", href: "/dashboard/orders", icon: ShoppingBag },
  {
    label: "Demandes de services",
    href: "/dashboard/service-requests",
    icon: ClipboardList,
  },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  { label: "Avis", href: "/dashboard/reviews", icon: Star },
  { label: "Litiges", href: "/dashboard/disputes", icon: Scale },
  { label: "Panier", href: "/cart", icon: Package },
];

export const sellerNav: SidebarItem[] = [
  { label: "Dashboard", href: "/seller", icon: LayoutDashboard },
  { label: "Ma boutique", href: "/seller/store", icon: Store },
  { label: "Produits", href: "/seller/products", icon: Package },
  {
    label: "Profil professionnel",
    href: "/seller/professional",
    icon: User,
  },
  { label: "Services", href: "/seller/services", icon: Wrench },
  {
    label: "Demandes de services",
    href: "/seller/service-requests",
    icon: ClipboardList,
  },
  { label: "Messages", href: "/seller/messages", icon: MessageSquare },
  {
    label: "Notifications",
    href: "/seller/notifications",
    icon: Bell,
  },
  { label: "Commandes", href: "/seller/orders", icon: ShoppingBag },
  { label: "Litiges", href: "/seller/disputes", icon: Scale },
  { label: "Paiements", href: "/seller/payments", icon: CreditCard },
  { label: "Statistiques", href: "/seller/stats", icon: BarChart3 },
  { label: "Abonnement", href: "/seller/subscription", icon: Sparkles },
  { label: "Moyens de paiement", href: "/seller/payments/methods", icon: Wallet },
  { label: "Mes achats", href: "/dashboard", icon: ShoppingBag },
];

export const adminNav: SidebarItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
  { label: "Photos d'accueil", href: "/admin/hero", icon: ImageIcon },
  { label: "Utilisateurs", href: "/admin/users", icon: Users },
  { label: "Boutiques", href: "/admin/stores", icon: Store },
  { label: "Produits", href: "/admin/products", icon: Package },
  { label: "Catégories", href: "/admin/categories", icon: FolderTree },
  { label: "Commandes", href: "/admin/orders", icon: ShoppingBag },
  { label: "Paiements", href: "/admin/payments", icon: CreditCard },
  { label: "Abonnements", href: "/admin/subscriptions", icon: Sparkles },
  {
    label: "Demandes de services",
    href: "/admin/service-requests",
    icon: ClipboardList,
  },
  { label: "Litiges", href: "/admin/disputes", icon: Scale },
];
