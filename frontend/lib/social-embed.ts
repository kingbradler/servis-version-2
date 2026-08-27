/**
 * Parse Instagram / TikTok links for profile CTAs and product video popup.
 */

export type SocialNetwork = "instagram" | "tiktok" | "facebook";

export interface SocialEmbed {
  network: "instagram" | "tiktok";
  /** iframe src when embed is supported */
  embedSrc: string | null;
  href: string;
  label: string;
}

function ensureHttps(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function parseTikTokVideoId(url: string): string | null {
  const href = ensureHttps(url);
  const match = href.match(/\/video\/(\d+)/);
  return match?.[1] ?? null;
}

export function parseInstagramCode(url: string): string | null {
  const href = ensureHttps(url);
  const match = href.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

export function resolveProductVideoEmbed(url: string | null | undefined): SocialEmbed | null {
  if (!url?.trim()) return null;
  const href = ensureHttps(url);
  try {
    const host = new URL(href).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("tiktok.com")) {
      const id = parseTikTokVideoId(href);
      return {
        network: "tiktok",
        embedSrc: id ? `https://www.tiktok.com/embed/v2/${id}` : null,
        href,
        label: "Voir sur TikTok",
      };
    }
    if (host.includes("instagram.com")) {
      const code = parseInstagramCode(href);
      const isReel = /\/reel\//i.test(href);
      return {
        network: "instagram",
        embedSrc: code
          ? `https://www.instagram.com/${isReel ? "reel" : "p"}/${code}/embed/`
          : null,
        href,
        label: "Voir sur Instagram",
      };
    }
  } catch {
    return null;
  }
  return null;
}
