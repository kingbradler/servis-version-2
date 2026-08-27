"use client";

import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type FormMessageVariant = "error" | "success" | "warning" | "info";

const styles: Record<
  FormMessageVariant,
  { box: string; icon: string; Icon: typeof XCircle }
> = {
  error: {
    box: "border-error/25 bg-error-light text-error",
    icon: "text-error",
    Icon: XCircle,
  },
  success: {
    box: "border-success/25 bg-success-light text-success",
    icon: "text-success",
    Icon: CheckCircle,
  },
  warning: {
    box: "border-warning/25 bg-warning-light text-warning",
    icon: "text-warning",
    Icon: AlertCircle,
  },
  info: {
    box: "border-info/25 bg-info-light text-info",
    icon: "text-info",
    Icon: Info,
  },
};

export interface FormMessageProps {
  message?: string | null;
  title?: string;
  variant?: FormMessageVariant;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Styled inline feedback for forms and actions (errors, success, warnings).
 * Prefer this over raw red text so users clearly see what went wrong.
 */
export function FormMessage({
  message,
  title,
  variant = "error",
  className,
  children,
}: FormMessageProps) {
  const body = message ?? children;
  if (!body && !title) return null;

  const { box, icon, Icon } = styles[variant];

  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border px-3.5 py-3 text-body-sm shadow-sm",
        box,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", icon)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        {body && (
          <div className={cn("leading-relaxed opacity-95", title && "mt-0.5")}>
            {body}
          </div>
        )}
      </div>
    </div>
  );
}
