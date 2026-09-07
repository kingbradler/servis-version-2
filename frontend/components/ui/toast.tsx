"use client";

import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import * as React from "react";
import { createContext, useCallback, useContext, useState } from "react";

import { getUserFacingErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "warning" | "error" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  /** Styled error toast — extracts a clear French message from any thrown value. */
  toastError: (
    err: unknown,
    options?: { title?: string; fallback?: string }
  ) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  default: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
  info: Info,
};

const variantStyles: Record<ToastVariant, string> = {
  default: "bg-surface border-border text-text-primary",
  success:
    "bg-success-light border-success/30 text-success shadow-[0_8px_30px_rgba(22,163,74,0.12)]",
  warning:
    "bg-warning-light border-warning/30 text-warning shadow-[0_8px_30px_rgba(217,119,6,0.12)]",
  error:
    "bg-error-light border-error/35 text-error shadow-[0_8px_30px_rgba(220,38,38,0.18)]",
  info: "bg-info-light border-info/30 text-info shadow-[0_8px_30px_rgba(37,99,235,0.12)]",
};

const titleStyles: Record<ToastVariant, string> = {
  default: "text-text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
};

const descriptionStyles: Record<ToastVariant, string> = {
  default: "text-text-secondary",
  success: "text-success/90",
  warning: "text-warning/90",
  error: "text-error/90",
  info: "text-info/90",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { ...t, id }]);
      const ttl = t.variant === "error" ? 7000 : 5000;
      setTimeout(() => dismiss(id), ttl);
    },
    [dismiss]
  );

  const toastError = useCallback(
    (err: unknown, options?: { title?: string; fallback?: string }) => {
      toast({
        title: options?.title ?? "Action impossible",
        description: getUserFacingErrorMessage(err, options?.fallback),
        variant: "error",
      });
    },
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, toastError, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-[max(1rem,var(--safe-bottom))] z-[100] flex w-auto max-w-full flex-col gap-2 sm:inset-x-auto sm:right-4 sm:left-auto sm:w-full sm:max-w-sm">
        {toasts.map((t) => {
          const variant = t.variant ?? "default";
          const Icon = icons[variant];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex gap-3 rounded-xl border p-4 animate-in slide-in-from-bottom-2",
                variantStyles[variant]
              )}
              role={variant === "error" || variant === "warning" ? "alert" : "status"}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-body-sm font-semibold leading-snug",
                    titleStyles[variant]
                  )}
                >
                  {t.title}
                </p>
                {t.description && (
                  <p
                    className={cn(
                      "mt-1 text-caption leading-relaxed",
                      descriptionStyles[variant]
                    )}
                  >
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
