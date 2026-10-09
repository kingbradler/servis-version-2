import Image from "next/image";
import Link from "next/link";

import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

type LogoVariant = "mark" | "lockup" | "wordmark";
type LogoTone = "auto" | "on-light" | "on-dark";

export interface ServisLogoProps {
  variant?: LogoVariant;
  /** auto = light mark + dark mark swap with theme */
  tone?: LogoTone;
  href?: string | null;
  className?: string;
  markClassName?: string;
  priority?: boolean;
}

function Mark({
  tone,
  markClassName,
  priority,
}: {
  tone: LogoTone;
  markClassName?: string;
  priority?: boolean;
}) {
  if (tone === "on-dark") {
    return (
      <Image
        src={BRAND.mark.dark}
        alt=""
        width={512}
        height={512}
        priority={priority}
        unoptimized
        className={cn("h-8 w-auto object-contain", markClassName)}
      />
    );
  }

  if (tone === "on-light") {
    return (
      <Image
        src={BRAND.mark.light}
        alt=""
        width={512}
        height={512}
        priority={priority}
        unoptimized
        className={cn("h-8 w-auto object-contain", markClassName)}
      />
    );
  }

  return (
    <>
      <Image
        src={BRAND.mark.light}
        alt=""
        width={512}
        height={512}
        priority={priority}
        unoptimized
        className={cn("h-8 w-auto object-contain dark:hidden", markClassName)}
      />
      <Image
        src={BRAND.mark.dark}
        alt=""
        width={512}
        height={512}
        priority={priority}
        unoptimized
        className={cn("hidden h-8 w-auto object-contain dark:block", markClassName)}
      />
    </>
  );
}

export function ServisLogo({
  variant = "lockup",
  tone = "auto",
  href = "/",
  className,
  markClassName,
  priority = false,
}: ServisLogoProps) {
  const wordmark = (
    <span className="font-display text-[1.05em] font-extrabold tracking-tight text-current">
      Servis<span className="text-primary">.</span>
    </span>
  );

  const content =
    variant === "mark" ? (
      <span className="inline-flex items-center" aria-label={BRAND.name}>
        <Mark tone={tone} markClassName={markClassName} priority={priority} />
      </span>
    ) : variant === "wordmark" ? (
      <span aria-label={BRAND.name}>{wordmark}</span>
    ) : (
      <span className="inline-flex items-center gap-2" aria-label={BRAND.name}>
        <Mark tone={tone} markClassName={markClassName} priority={priority} />
        {wordmark}
      </span>
    );

  if (href === null) {
    return (
      <span className={cn("inline-flex items-center text-text-primary", className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center text-text-primary transition-opacity hover:opacity-90",
        className
      )}
    >
      {content}
    </Link>
  );
}
