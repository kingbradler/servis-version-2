import type { Metadata } from "next";

import { HomePage } from "@/features/marketplace/components/HomePage";

export const metadata: Metadata = {
  title: "SERVIS — Marketplace étudiants entrepreneurs",
  description:
    "Découvrez les produits et boutiques d'étudiants entrepreneurs près de chez vous. Recherche, catégories et panier sécurisé.",
};

export default function Page() {
  return <HomePage />;
}
