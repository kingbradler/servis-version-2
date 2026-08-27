"use client";

import { ProductCard } from "@/components/ui/product-card";
import type { ProductPublic } from "../types/product.types";
import { resolveMediaUrl } from "../utils/media";

function productBadge(product: ProductPublic): string | undefined {
  if (product.is_boosted || product.sponsored_label) {
    return product.sponsored_label || "Promu";
  }
  if (product.is_featured) return "À la une";
  if (product.stock <= 0 || product.status === "OUT_OF_STOCK") {
    return "Indisponible";
  }
  return undefined;
}

export function ProductGrid({
  products,
  animate = true,
}: {
  products: ProductPublic[];
  animate?: boolean;
}) {
  return (
    <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] lg:[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
      {products.map((product, index) => {
        const primary = [...product.images].sort((a, b) => a.order - b.order)[0];
        return (
          <div
            key={product.id}
            className={
              animate
                ? "motion-safe:animate-[fade-up_0.35s_ease_both]"
                : undefined
            }
            style={
              animate
                ? { animationDelay: `${Math.min(index * 60, 360)}ms` }
                : undefined
            }
          >
            <ProductCard
              name={product.name}
              price={Number(product.price)}
              comparePrice={
                product.compare_price
                  ? Number(product.compare_price)
                  : undefined
              }
              imageUrl={resolveMediaUrl(primary?.image)}
              storeName={product.store.name}
              badge={productBadge(product)}
              href={`/stores/${product.store.slug}/products/${product.slug}`}
            />
          </div>
        );
      })}
    </div>
  );
}
