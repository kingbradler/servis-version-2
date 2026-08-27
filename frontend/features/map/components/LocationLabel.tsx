"use client";

import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

export interface LocationLabelProps {
  city?: string | null;
  neighborhood?: string | null;
  className?: string;
}

/** Displays a simple city/neighborhood pin — never invents distance. */
export function LocationLabel({
  city,
  neighborhood,
  className,
}: LocationLabelProps) {
  if (!city && !neighborhood) return null;
  const text = [neighborhood, city].filter(Boolean).join(" · ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-caption text-text-muted",
        className
      )}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {text}
    </span>
  );
}
