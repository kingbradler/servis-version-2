"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GeoCoordinates } from "@/features/map/types";
import { cn } from "@/lib/utils";
import {
  DEFAULT_NEARBY_RADIUS_KM,
  GeolocationRequestError,
  requestUserLocation,
} from "@/features/map/geolocation";

export interface AroundMeButtonProps {
  onLocated: (coords: GeoCoordinates, radiusKm: number) => void;
  radiusKm?: number;
  className?: string;
}

export function AroundMeButton({
  onLocated,
  radiusKm = DEFAULT_NEARBY_RADIUS_KM,
  className,
}: AroundMeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const coords = await requestUserLocation();
      onLocated(coords, radiusKm);
    } catch (err) {
      const message =
        err instanceof GeolocationRequestError
          ? err.message
          : "Impossible d'obtenir votre position.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-w-0 w-full sm:w-auto", className)}>
      <Button
        type="button"
        variant="outline"
        className="w-full max-w-full rounded-xl sm:w-auto"
        loading={loading}
        onClick={() => void handleClick()}
      >
        <MapPin className="h-4 w-4" />
        Trouver autour de moi
      </Button>
      {error && (
        <p className="mt-2 max-w-full break-words text-caption text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
