"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GeoCoordinates } from "@/features/map/types";
import {
  GeolocationRequestError,
  requestUserLocation,
} from "@/features/map/geolocation";
import { cn } from "@/lib/utils";

export interface FillCoordinatesButtonProps {
  onLocated: (coords: GeoCoordinates) => void;
  className?: string;
  label?: string;
  /** Seller/profile wording vs explore. */
  variant?: "outline" | "primary" | "ghost";
  size?: "sm" | "md" | "lg";
}

/**
 * Explicit user action → GPS → fill lat/lng fields (seller profile / store).
 * Browsers block geolocation without a click — never call on page load.
 */
export function FillCoordinatesButton({
  onLocated,
  className,
  label = "Utiliser ma position",
  variant = "outline",
  size = "sm",
}: FillCoordinatesButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const coords = await requestUserLocation({
        enableHighAccuracy: true,
        timeoutMs: 15_000,
      });
      onLocated(coords);
    } catch (err) {
      const message =
        err instanceof GeolocationRequestError
          ? err.code === "permission_denied"
            ? "Autorisez la localisation dans le navigateur, puis réessayez."
            : err.message
          : "Impossible d'obtenir votre position.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className="rounded-xl"
        loading={loading}
        onClick={() => void handleClick()}
      >
        <MapPin className="h-4 w-4" />
        {label}
      </Button>
      {error && (
        <p className="mt-2 text-caption text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Format for Decimal(9,6) backend fields. */
export function formatCoordinate(value: number): string {
  return value.toFixed(6);
}
