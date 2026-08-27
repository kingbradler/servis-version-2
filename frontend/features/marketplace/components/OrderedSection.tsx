"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function OrderedSectionHeader({
  index,
  title,
  description,
  href,
  linkLabel,
  tone = "light",
}: {
  index: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
      <div className="min-w-0">
        <p
          className={cn(
            "font-display text-[11px] font-extrabold uppercase tracking-[0.28em]",
            tone === "dark" ? "text-primary" : "text-primary"
          )}
        >
          {index}
        </p>
        <h2
          className={cn(
            "font-display mt-2 text-[clamp(1.65rem,3vw,2.35rem)] font-extrabold tracking-tight",
            tone === "dark" ? "text-white" : "text-text-primary"
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-2 max-w-xl text-body-sm",
              tone === "dark" ? "text-white/55" : "text-text-secondary"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className={cn(
            "hidden shrink-0 text-[12px] font-bold uppercase tracking-[0.16em] underline-offset-4 hover:underline sm:inline",
            tone === "dark" ? "text-white" : "text-text-primary"
          )}
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function OrderedSection({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <section className={cn(className)}>
      <div
        className={cn(
          "mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6 sm:py-16 lg:px-12 lg:py-20",
          innerClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
