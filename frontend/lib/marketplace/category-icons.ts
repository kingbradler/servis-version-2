import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Camera,
  Coffee,
  Gamepad2,
  Handshake,
  Heart,
  Home,
  Laptop,
  Music,
  Package,
  Palette,
  Shirt,
  ShoppingBag,
  Smartphone,
  Utensils,
  Wrench,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  package: Package,
  smartphone: Smartphone,
  laptop: Laptop,
  shirt: Shirt,
  "shopping-bag": ShoppingBag,
  utensils: Utensils,
  coffee: Coffee,
  home: Home,
  wrench: Wrench,
  palette: Palette,
  camera: Camera,
  music: Music,
  gamepad: Gamepad2,
  "gamepad-2": Gamepad2,
  heart: Heart,
  handshake: Handshake,
  "book-open": BookOpen,
  briefcase: Briefcase,
};

/** Resolve Lucide icon name from API `icon` field (kebab-case). */
export function resolveCategoryIcon(icon?: string | null): LucideIcon {
  if (!icon) return Package;
  const key = icon.trim().toLowerCase();
  return ICON_MAP[key] ?? Package;
}
