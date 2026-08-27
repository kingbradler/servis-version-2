"use client";

import dynamic from "next/dynamic";

import type { MapViewProps } from "./MapView";
import { Skeleton } from "@/components/ui/skeleton";

const MapViewLazy = dynamic(
  () => import("./MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-full min-h-[280px] w-full rounded-[18px]" />
    ),
  }
);

/** Client-only Mapbox map — safe for App Router / SSR. */
export function MapViewClient(props: MapViewProps) {
  return <MapViewLazy {...props} />;
}
