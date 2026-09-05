export const env = {
  apiUrl:apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "https://servis-version-2.onrender.com/api/v1", ,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
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
} as const;
