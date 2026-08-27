import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produits",
  description:
    "Parcourez le catalogue SERVIS : recherche, filtres par catégorie, ville, boutique et prix.",
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
