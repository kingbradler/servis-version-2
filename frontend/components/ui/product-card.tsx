import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { cn, formatPrice } from "@/lib/utils";

export interface ProductCardProps {
  name: string;
  price: number;
  imageUrl?: string;
  storeName?: string;
  description?: string;
  rating?: number;
  comparePrice?: number;
  href?: string;
  badge?: string;
  className?: string;
}

export function ProductCard({
  name,
  price,
  imageUrl,
  storeName,
  description,
  rating,
  comparePrice,
  href = "#",
  badge,
  className,
}: ProductCardProps) {
  const summary = description?.replace(/\s+/g, " ").trim();

  return (
    <Link href={href} className={cn("block group", className)}>
      <article className="h-full overflow-hidden rounded-[18px] border border-cr2 bg-white transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/20 group-hover:shadow-[0_8px_36px_rgba(0,0,0,0.15)] dark:border-border dark:bg-surface">
        <div className="relative aspect-square overflow-hidden bg-primary/10 sm:aspect-[4/5]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-caption text-text-muted">
              Image produit
            </div>
          )}
          {badge && (
            <Badge variant="primary" className="absolute left-2.5 top-2.5">
              {badge}
            </Badge>
          )}
        </div>
        <div className="space-y-1 px-3.5 py-3">
          {storeName && <p className="truncate text-caption">{storeName}</p>}
          <h3 className="line-clamp-2 text-body-sm font-medium text-text-primary transition-colors group-hover:text-primary">
            {name}
          </h3>
          {summary ? (
            <p className="line-clamp-3 text-[13px] leading-snug text-text-secondary">
              {summary}
            </p>
          ) : null}
          {rating !== undefined && <Rating value={rating} size="sm" />}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-body font-semibold text-text-primary">
              {formatPrice(price)}
            </span>
            {comparePrice && comparePrice > price && (
              <span className="text-caption line-through">
                {formatPrice(comparePrice)}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
