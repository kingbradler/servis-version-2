"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${clamped} sur 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(clamped);
        return (
          <Star
            key={i}
            className={cn(
              iconClass,
              filled
                ? "fill-primary text-primary"
                : "fill-transparent text-text-muted"
            )}
          />
        );
      })}
    </div>
  );
}

export function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Note">
      {Array.from({ length: 5 }).map((_, i) => {
        const rating = i + 1;
        const filled = rating <= value;
        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={rating === value}
            disabled={disabled}
            onClick={() => onChange(rating)}
            className="rounded p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Star
              className={cn(
                "h-7 w-7",
                filled
                  ? "fill-primary text-primary"
                  : "fill-transparent text-text-muted"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
