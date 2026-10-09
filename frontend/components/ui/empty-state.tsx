import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  /** Use on a dark background (homepage product strip). */
  tone?: "default" | "onDark";
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
  tone = "default",
}: EmptyStateProps) {
  const onDark = tone === "onDark";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-16 w-16 items-center justify-center rounded-full",
          onDark ? "bg-white/10" : "bg-surface-secondary"
        )}
      >
        <Icon
          className={cn("h-7 w-7", onDark ? "text-white/55" : "text-text-muted")}
        />
      </div>
      <h3
        className={cn(
          "mb-1 text-heading-s",
          onDark ? "text-white" : "text-text-primary"
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "mb-4 max-w-sm text-body-sm",
            onDark ? "text-white/70" : "text-text-secondary"
          )}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
