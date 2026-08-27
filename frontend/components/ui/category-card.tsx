import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CategoryCardProps {
  name: string;
  slug: string;
  icon?: LucideIcon;
  productCount?: number;
  href?: string;
  className?: string;
}

export function CategoryCard({
  name,
  slug,
  icon: Icon = Package,
  productCount,
  href,
  className,
}: CategoryCardProps) {
  const categoryHref = href ?? `/categories/${slug}`;

  return (
    <Link href={categoryHref} className={cn("block group", className)}>
      <div className="flex min-h-[120px] flex-col items-center justify-center gap-2.5 rounded-2xl bg-surface-secondary/70 px-3 py-5 text-center transition-colors duration-300 group-hover:bg-primary-light dark:bg-surface-secondary/50">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_20px_rgba(232,66,8,0.25)] transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-body-sm font-medium text-text-primary transition-colors group-hover:text-primary">
          {name}
        </h3>
        {productCount !== undefined && (
          <span className="text-caption">
            {productCount} produit{productCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </Link>
  );
}
