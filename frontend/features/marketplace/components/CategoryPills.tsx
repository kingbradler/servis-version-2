"use client";

import { LayoutGrid } from "lucide-react";

import { resolveCategoryIcon } from "@/lib/marketplace/category-icons";
import { cn } from "@/lib/utils";
import type { Category } from "@/features/categories/types/category.types";

export function CategoryPills({
  categories,
  activeSlug,
  onSelect,
  allLabel = "Tout",
}: {
  categories: Category[];
  activeSlug?: string;
  onSelect: (slug: string | undefined) => void;
  allLabel?: string;
}) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        className={cn(
          "inline-flex items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-4 py-2 text-[13px] font-medium transition-all",
          !activeSlug
            ? "border-primary bg-primary text-white"
            : "border-cr2 bg-white text-text-secondary hover:border-primary hover:text-primary dark:border-border dark:bg-surface"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        {allLabel}
      </button>
      {categories.map((cat) => {
        const Icon = resolveCategoryIcon(cat.icon);
        const active = activeSlug === cat.slug;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.slug)}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] px-4 py-2 text-[13px] font-medium transition-all",
              active
                ? "border-primary bg-primary text-white"
                : "border-cr2 bg-white text-text-secondary hover:border-primary hover:text-primary dark:border-border dark:bg-surface"
            )}
          >
            <Icon className="h-4 w-4" />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
