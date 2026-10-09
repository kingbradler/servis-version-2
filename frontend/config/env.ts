const PROD_API_URL = "https://api.servis-superrapid.com/api/v1";
const LOCAL_API_URL = "http://localhost:8000/api/v1";
const PROD_APP_URL = "https://www.servis-superrapid.com";
const LOCAL_APP_URL = "http://localhost:3000";

function isLocalUrl(value: string): boolean {
  return (
    !value ||
    value.includes("localhost") ||
    value.includes("127.0.0.1")
  );
}

function isBrowserOnPublicHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

/** Resolve API base. On Vercel, never keep a localhost fallback. */
export function getApiUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (isBrowserOnPublicHost() && isLocalUrl(configured)) {
    return PROD_API_URL;
  }
  return configured || LOCAL_API_URL;
}

export function getAppUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (isBrowserOnPublicHost() && isLocalUrl(configured)) {
    return PROD_APP_URL;
  }
  return configured || LOCAL_APP_URL;
}

export const env = {
  get apiUrl() {
    return getApiUrl();
  },
  get appUrl() {
    return getAppUrl();
  },
  /** Public Mapbox token — never log this value. */
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || null,
  /** WhatsApp plateforme (chiffres internationaux, sans +) */
  platformWhatsapp:
    process.env.NEXT_PUBLIC_PLATFORM_WHATSAPP?.trim() || "212631741723",
  /** Téléphone affiché (avec espaces / +) */
  platformPhone:
    process.env.NEXT_PUBLIC_PLATFORM_PHONE?.trim() || "+212 631741723",
  /** Email contact SERVIS */
  platformEmail:
    process.env.NEXT_PUBLIC_PLATFORM_EMAIL?.trim() ||
    "servis.superrapid@gmail.com",
  appName: "SERVIS",
};
