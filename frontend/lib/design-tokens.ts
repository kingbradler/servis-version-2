/**
 * SERVIS design tokens — Phase 7.1 / 7.2 (Bolt-inspired direction).
 * Prefer Tailwind semantic classes (bg-primary, text-text-secondary, etc.) in UI.
 */

export const COLOR_CORE = {
  orange: "#E84208",
  orangeBright: "#FF6534",
  orangeHover: "#C73807",
  orangeActive: "#A52F06",
  orangeLight: "#FDEAE3",
  black: "#0E0E0E",
  blackElevated: "#161616",
  cream: "#F7F5F1",
  creamMuted: "#EDEBE5",
  white: "#FFFFFF",
} as const;

export const FONTS = {
  display: "Syne",
  body: "DM Sans",
} as const;

export const RADIUS = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.125rem",
  full: "9999px",
} as const;

export const SHADOW = {
  sm: "0 1px 2px rgba(26, 26, 26, 0.05)",
  md: "0 4px 12px rgba(26, 26, 26, 0.08)",
  lg: "0 8px 24px rgba(26, 26, 26, 0.12)",
  cardHover: "0 8px 36px rgba(0, 0, 0, 0.15)",
} as const;

export const SHADOW_DARK = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
  md: "0 4px 12px rgba(0, 0, 0, 0.4)",
  lg: "0 8px 24px rgba(0, 0, 0, 0.5)",
} as const;

export const MOTION = {
  fadeUp: "fade-up 0.35s ease both",
  annScroll: "ann-scroll 30s linear infinite",
  heroKenBurns: "hero-kenburns 8s ease-out forwards",
} as const;

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

/** Badge semantic mapping for marketplace / workflows (UX labels). */
export const BADGE_SEMANTICS = {
  ACTIVE: "success",
  FEATURED: "primary",
  AVAILABLE: "success",
  QUOTE: "secondary",
  PENDING: "warning",
  ACCEPTED: "info",
  REJECTED: "error",
  COMPLETED: "success",
  CANCELLED: "secondary",
  SUSPENDED: "error",
  DRAFT: "secondary",
} as const;

export const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "danger",
  "link",
] as const;

export const CARD_FAMILIES = [
  "ProductCard",
  "ServiceCard",
  "StoreCard",
  "ProfessionalCard",
  "CategoryCard",
] as const;
