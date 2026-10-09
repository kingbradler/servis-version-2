import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
  className,
  children,
  tone = "light",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  /** light = cream panel ; dark = Bolt-style black band */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <header
      className={cn(
        "relative mb-8 min-w-0 max-w-full overflow-hidden rounded-[22px] px-4 py-6 sm:mb-10 sm:rounded-[26px] sm:px-8 sm:py-10",
        dark
          ? "bg-dk text-white"
          : "bg-[radial-gradient(ellipse_80%_80%_at_90%_10%,rgba(232,66,8,0.16),transparent_55%),linear-gradient(145deg,var(--surface)_0%,rgba(232,66,8,0.05)_100%)] dark:bg-[radial-gradient(ellipse_80%_80%_at_90%_10%,rgba(232,66,8,0.22),transparent_55%),linear-gradient(145deg,var(--surface)_0%,rgba(232,66,8,0.08)_100%)]",
        className
      )}
    >
      {dark && (
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(232,66,8,0.22),transparent_68%)]" />
      )}
      <div className="relative min-w-0">
        {eyebrow && (
          <p
            className={cn(
              "mb-2 text-caption font-semibold uppercase tracking-[0.2em]",
              dark ? "text-primary" : "text-primary"
            )}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            "font-display max-w-2xl text-[clamp(1.6rem,7vw,2.25rem)] font-extrabold tracking-tight sm:text-4xl",
            dark ? "text-white" : "text-text-primary"
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "mt-2 max-w-xl text-body",
              dark ? "text-white/55" : "text-text-secondary"
            )}
          >
            {description}
          </p>
        )}
        {children}
      </div>
    </header>
  );
}
