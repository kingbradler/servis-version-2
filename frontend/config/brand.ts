/**
 * SERVIS brand asset paths — Phase 7.1.
 * Swap logo files under /public/brand without changing call sites.
 * Prefer ServisLogo component over direct Image usage.
 */

export const BRAND = {
  name: "SERVIS",
  /** Compact mark (chariot + S) — favicon, PWA, mobile nav */
  mark: {
    light: "/brand/servis-mark.png",
    dark: "/brand/servis-mark-on-dark.png",
    png: "/brand/servis-mark.png",
  },
  /** Future: lockup SVG with wordmark baked in (optional) */
  lockup: {
    light: "/brand/servis-mark.png",
    dark: "/brand/servis-mark-on-dark.png",
  },
  /** App / PWA placeholders — replace when icons are finalized */
  appIcon: {
    /** 192×192 recommended */
    sm: "/brand/servis-mark.png",
    /** 512×512 recommended */
    lg: "/brand/servis-mark.png",
  },
  colors: {
    orange: "#E84208",
    orangeBright: "#FF6534",
    black: "#0E0E0E",
    cream: "#F7F5F1",
    white: "#FFFFFF",
  },
} as const;

export type BrandConfig = typeof BRAND;
