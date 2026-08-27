import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ServisLogo } from "@/components/brand/ServisLogo";
import { cn } from "@/lib/utils";

export function DashboardWelcome({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-dk/10 bg-dk px-5 py-6 text-white sm:px-7 sm:py-7",
        "motion-safe:animate-[fade-up_0.45s_ease-out_both]",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(232,66,8,0.45),transparent_68%)] blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/4 h-40 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <ServisLogo
            variant="mark"
            tone="on-dark"
            href={null}
            className="mb-4 opacity-95"
            markClassName="h-8 w-auto"
          />
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 font-display text-[clamp(1.6rem,3.5vw,2.15rem)] font-extrabold leading-tight tracking-tight">
            {title}
          </h2>
          {description ? (
            <div className="mt-2 max-w-xl text-body-sm text-white/65">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}

export function DashboardStat({
  label,
  value,
  href,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  href?: string;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        "rounded-[18px] border border-cr2 bg-white p-4 shadow-sm transition-all dark:border-border dark:bg-surface",
        href &&
          "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_10px_32px_rgba(14,14,14,0.1)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-text-secondary">{label}</p>
          <p className="mt-1 font-display text-[28px] font-extrabold leading-none tracking-tight text-text-primary">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-caption text-text-muted">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
            <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!href) return inner;
  return (
    <Link
      href={href}
      className="block motion-safe:animate-[fade-up_0.4s_ease_both] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {inner}
    </Link>
  );
}

export function DashboardQuickLink({
  href,
  label,
  icon: Icon,
  className,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-[16px] border border-cr2 bg-white px-4 py-3.5 text-body-sm font-semibold text-text-primary transition-all",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_28px_rgba(14,14,14,0.08)]",
        "dark:border-border dark:bg-surface",
        className
      )}
    >
      {Icon ? (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-dk text-white transition-colors group-hover:bg-primary">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      {label}
    </Link>
  );
}

export function DashboardSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[17px] font-extrabold text-text-primary">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
