import type { Metadata } from "next";

import { ProductDetailView } from "@/features/products/components/ProductDetailView";
import { publicFetch } from "@/lib/api/public";
import type { ProductPublic } from "@/features/products/types/product.types";

type Props = {
  params: Promise<{ storeSlug: string; productSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeSlug, productSlug } = await params;
  const product = await publicFetch<ProductPublic>(
    `/stores/${storeSlug}/products/${productSlug}/`
  );
  if (!product) {
    return { title: "Produit introuvable" };
  }
  return {
    title: product.name,
    description:
      product.description?.slice(0, 160) ||
      `${product.name} — ${product.price} MAD chez ${product.store.name}`,
  };
}

export default async function Page({ params }: Props) {
  const { storeSlug, productSlug } = await params;
  return (
    <ProductDetailView storeSlug={storeSlug} productSlug={productSlug} />
  );
}
