import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LocationLabel } from "@/features/map/components/LocationLabel";
import { formatDistanceKm } from "@/features/map/format-distance";
import { cn } from "@/lib/utils";

export interface ProfessionalCardProps {
  displayName: string;
  slug: string;
  headline?: string;
  city?: string | null;
  neighborhood?: string | null;
  avatarUrl?: string | null;
  distanceKm?: number | null;
  serviceCount?: number;
  href?: string;
  className?: string;
  index?: number;
}

/**
 * Marketplace card for a professional profile.
 * Shares rounded card + hover lift with Product/Service/Store cards.
 */
export function ProfessionalCard({
  displayName,
  slug,
  headline,
  city,
  neighborhood,
  avatarUrl,
  distanceKm,
  serviceCount,
  href,
  className,
  index = 0,
}: ProfessionalCardProps) {
  const profileHref = href ?? `/professionals/${slug}`;
  const distance = formatDistanceKm(distanceKm);

  return (
    <Link
      href={profileHref}
      className={cn(
        "block group motion-safe:animate-[fade-up_0.35s_ease_both]",
        className
      )}
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
    >
      <article
        className={cn(
          "flex h-full flex-col gap-3 overflow-hidden rounded-[18px] border border-cr2 bg-white p-4 transition-all duration-300",
          "group-hover:-translate-y-1 group-hover:border-primary/20 group-hover:shadow-[0_8px_36px_rgba(0,0,0,0.15)]",
          "dark:border-border dark:bg-surface"
        )}
      >
        <div className="flex items-start gap-3">
          <Avatar
            size="lg"
            className="shrink-0 border-2 border-cr2 dark:border-border"
          >
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback>
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate font-display text-[17px] font-extrabold text-text-primary transition-colors group-hover:text-primary">
              {displayName}
            </h3>
            {headline ? (
              <p className="line-clamp-2 text-body-sm text-text-secondary">
                {headline}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <LocationLabel
                city={city}
                neighborhood={neighborhood || undefined}
              />
              {distance ? (
                <span className="text-caption text-text-muted">{distance}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {typeof serviceCount === "number" && (
            <Badge variant="secondary">
              {serviceCount} service{serviceCount > 1 ? "s" : ""}
            </Badge>
          )}
          <span className="text-caption font-medium text-primary">Voir →</span>
        </div>
      </article>
    </Link>
  );
}
