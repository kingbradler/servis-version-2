"use client";

import { Star } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface RatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (value: number) => void;
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function Rating({
  value,
  max = 5,
  size = "md",
  interactive = false,
  onChange,
  showValue = false,
  className,
}: RatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  const displayValue = hoverValue ?? value;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center" role={interactive ? "radiogroup" : undefined}>
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const filled = starValue <= displayValue;

          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              className={cn(
                "transition-colors",
                interactive && "cursor-pointer hover:scale-110",
                !interactive && "cursor-default"
              )}
              onClick={() => interactive && onChange?.(starValue)}
              onMouseEnter={() => interactive && setHoverValue(starValue)}
              onMouseLeave={() => interactive && setHoverValue(null)}
              aria-label={`${starValue} étoile${starValue > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  filled
                    ? "fill-primary text-primary"
                    : "fill-none text-border-strong"
                )}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-body-sm text-text-secondary ml-1">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
