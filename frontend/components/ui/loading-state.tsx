import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingState({
  message = "Chargement...",
  className,
  size = "md",
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 gap-3",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn(sizeClasses[size], "animate-spin text-primary")}
      />
      {message && (
        <p className="text-body-sm text-text-secondary">{message}</p>
      )}
      <span className="sr-only">{message}</span>
    </div>
  );
}
