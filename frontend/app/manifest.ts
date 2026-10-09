import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SERVIS",
    short_name: "SERVIS",
    description:
      "Marketplace des étudiants entrepreneurs — produits et services près de chez vous, au Maroc.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F5F1",
    theme_color: "#E84208",
    lang: "fr",
    dir: "ltr",
    categories: ["shopping", "business"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
