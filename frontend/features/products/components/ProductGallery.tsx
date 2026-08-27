"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import type { ProductImage } from "../types/product.types";
import { resolveMediaUrl } from "../utils/media";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const sorted = useMemo(
    () => [...images].sort((a, b) => a.order - b.order),
    [images]
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const primary =
    sorted.find((img) => img.order === 0) ?? sorted[0] ?? null;
  const active =
    sorted.find((img) => img.id === activeId) ?? primary ?? null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-[18px] border border-cr2 bg-primary/10 dark:border-border">
        {active?.image ? (
          <Image
            src={resolveMediaUrl(active.image)!}
            alt={active.alt_text || productName}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-caption text-text-muted">
            Image produit
          </div>
        )}
      </div>

      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((img) => {
            const url = resolveMediaUrl(img.image);
            const isActive = (active?.id ?? primary?.id) === img.id;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveId(img.id)}
                className={cn(
                  "relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border-[1.5px] bg-surface-secondary transition-all",
                  isActive
                    ? "border-primary shadow-[0_0_0_1px_var(--primary)]"
                    : "border-cr2 hover:border-primary/40 dark:border-border"
                )}
                aria-label={`Voir image ${img.order + 1}`}
              >
                {url ? (
                  <Image
                    src={url}
                    alt={img.alt_text || productName}
                    fill
                    className="object-cover"
                    sizes="68px"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
