import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catégories",
  description: "Parcourez les catégories de produits sur SERVIS.",
};

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
