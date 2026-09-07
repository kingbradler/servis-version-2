import Image from "next/image";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StoreCardProps {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  city?: string;
  productCount?: number;
  href?: string;
  className?: string;
  index?: number;
}

export function StoreCard({
  name,
  slug,
  description,
  logoUrl,
  bannerUrl,
  city,
  productCount,
  href,
  className,
  index = 0,
}: StoreCardProps) {
  const storeHref = href ?? `/stores/${slug}`;

  return (
    <Link
      href={storeHref}
      className={cn(
        "block group motion-safe:animate-[fade-up_0.35s_ease_both]",
        className
      )}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
    >
      <article className="h-full overflow-hidden rounded-[18px] border border-cr2 bg-white transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/20 group-hover:shadow-[0_8px_36px_rgba(0,0,0,0.15)] dark:border-border dark:bg-surface">
        <div className="relative h-32 overflow-hidden bg-primary/10">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt={`Bannière ${name}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/25 via-dk/5 to-primary/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        </div>
        <div className="relative px-4 pb-4 pt-0">
          <div className="-mt-7 mb-3">
            <Avatar
              size="lg"
              className="border-2 border-white shadow-md dark:border-surface"
            >
              {logoUrl && <AvatarImage src={logoUrl} alt={name} />}
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          <h3 className="truncate font-display text-[17px] font-extrabold text-text-primary transition-colors group-hover:text-primary">
            {name}
          </h3>
          {description?.trim() ? (
            <p className="mt-1.5 line-clamp-4 text-body-sm leading-relaxed text-text-secondary">
              {description.trim()}
            </p>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            {city && <Badge variant="secondary">{city}</Badge>}
            {productCount !== undefined && (
              <span className="text-caption">
                {productCount} produit{productCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
