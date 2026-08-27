import type { Metadata } from "next";

import { StoreProductsPage } from "@/features/stores/components/StoreProductsPage";
import { publicFetch } from "@/lib/api/public";
import type { StorePublic } from "@/features/stores/types/store.types";

type Props = { params: Promise<{ storeSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await publicFetch<StorePublic>(`/stores/${storeSlug}/`);
  return {
    title: store ? `Produits — ${store.name}` : "Produits boutique",
    description: store
      ? `Catalogue des produits de ${store.name} sur SERVIS.`
      : "Produits de la boutique",
  };
}

export default async function Page({ params }: Props) {
  const { storeSlug } = await params;
  return <StoreProductsPage storeSlug={storeSlug} />;
}
