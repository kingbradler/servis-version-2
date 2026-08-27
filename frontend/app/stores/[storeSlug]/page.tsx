import type { Metadata } from "next";

import { StoreDetailPage } from "@/features/stores/components/StoreDetailPage";
import { publicFetch } from "@/lib/api/public";
import type { StorePublic } from "@/features/stores/types/store.types";

type Props = { params: Promise<{ storeSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await publicFetch<StorePublic>(`/stores/${storeSlug}/`);
  if (!store) {
    return { title: "Boutique introuvable" };
  }
  return {
    title: store.name,
    description:
      store.description?.slice(0, 160) ||
      `Boutique ${store.name} sur SERVIS — ${store.city?.name ?? ""}`.trim(),
  };
}

export default async function Page({ params }: Props) {
  const { storeSlug } = await params;
  return <StoreDetailPage storeSlug={storeSlug} />;
}
