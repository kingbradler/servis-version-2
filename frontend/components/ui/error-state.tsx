import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Impossible de charger",
  message = "Un problème est survenu. Vérifiez votre connexion puis réessayez.",
  retryLabel = "Réessayer",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-error/20 bg-error-light/60 px-4 py-12 text-center",
        className
      )}
      role="alert"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 ring-1 ring-error/20">
        <AlertTriangle className="h-7 w-7 text-error" aria-hidden />
      </div>
      <h3 className="mb-1 text-heading-s font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mb-5 max-w-md text-body-sm leading-relaxed text-text-secondary">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="md" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
