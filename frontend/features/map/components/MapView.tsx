"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../map-view.css";

import { formatDistanceKm } from "../format-distance";
import { getMapboxToken, warnMissingMapboxToken } from "../token";
import type { GeoCoordinates, MapMarker } from "../types";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from "../types";
import { cn } from "@/lib/utils";

const SOURCE_ID = "servis-markers";
const CLUSTER_LAYER = "servis-clusters";
const CLUSTER_COUNT_LAYER = "servis-cluster-count";
const POINT_LAYER = "servis-unclustered";

const KIND_COLOR: Record<string, string> = {
  store: "#E84208",
  service: "#FF6534",
  professional: "#0E0E0E",
};

const KIND_LABEL: Record<string, string> = {
  store: "Boutique",
  service: "Service",
  professional: "Pro",
};

export interface MapViewProps {
  markers: MapMarker[];
  userLocation?: GeoCoordinates | null;
  center?: GeoCoordinates;
  zoom?: number;
  selectedId?: string | null;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
  onReady?: () => void;
  /** Override token (tests). Defaults to NEXT_PUBLIC_MAPBOX_TOKEN. */
  accessToken?: string | null;
  /** Mapbox style URL — default streets (more readable than washed light). */
  mapStyle?: string;
  /** Where to place zoom controls. */
  navigationPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

function markersToGeoJson(markers: MapMarker[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: markers
      .filter((m) => m.kind !== "user")
      .map((m) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [m.coordinates.longitude, m.coordinates.latitude],
        },
        properties: {
          id: m.id,
          kind: m.kind,
          label: m.label,
          subtitle: m.subtitle ?? "",
          city: m.city ?? "",
          distanceKm: m.distanceKm ?? null,
          priceLabel: m.priceLabel ?? "",
          href: m.href ?? "",
        },
      })),
  };
}

function buildPopupHtml(props: Record<string, unknown>): string {
  const kind = String(props.kind ?? "");
  const kindLabel = KIND_LABEL[kind] ?? "Lieu";
  const label = escapeHtml(String(props.label ?? ""));
  const subtitle = String(props.subtitle ?? "");
  const city = String(props.city ?? "");
  const priceLabel = String(props.priceLabel ?? "");
  const href = String(props.href ?? "");
  const distance = formatDistanceKm(
    props.distanceKm == null ? null : Number(props.distanceKm)
  );
  const cta =
    kind === "store"
      ? "Voir la boutique"
      : kind === "professional"
        ? "Voir le professionnel"
        : "Voir le service";

  const lines = [
    `<div class="servis-map-popup">`,
    `<span class="servis-map-popup__kind servis-map-popup__kind--${escapeAttr(kind)}">${escapeHtml(kindLabel)}</span>`,
    `<p class="servis-map-popup__title">${label}</p>`,
  ];
  if (subtitle) {
    lines.push(
      `<p class="servis-map-popup__sub">${escapeHtml(subtitle)}</p>`
    );
  }
  if (city) {
    lines.push(
      `<p class="servis-map-popup__meta">${escapeHtml(city)}</p>`
    );
  }
  if (distance) {
    lines.push(
      `<p class="servis-map-popup__meta">${escapeHtml(distance)}</p>`
    );
  }
  if (priceLabel) {
    lines.push(
      `<p class="servis-map-popup__meta">${escapeHtml(priceLabel)}</p>`
    );
  }
  if (href) {
    lines.push(
      `<a class="servis-map-popup__cta" href="${escapeAttr(href)}">${escapeHtml(cta)} →</a>`
    );
  }
  lines.push(`</div>`);
  return lines.join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

export function MapView({
  markers,
  userLocation = null,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  selectedId = null,
  className,
  onMarkerClick,
  onReady,
  accessToken,
  mapStyle = "mapbox://styles/mapbox/streets-v12",
  navigationPosition = "bottom-right",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const markersRef = useRef(markers);
  const onMarkerClickRef = useRef(onMarkerClick);
  const token =
    accessToken !== undefined ? accessToken : getMapboxToken();

  useEffect(() => {
    markersRef.current = markers;
    onMarkerClickRef.current = onMarkerClick;
  }, [markers, onMarkerClick]);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [center.longitude, center.latitude],
      zoom,
      attributionControl: true,
    });
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      navigationPosition
    );
    mapRef.current = map;

    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "min(280px, calc(100vw - 2.5rem))",
      offset: 16,
      className: "servis-mapbox-popup",
    });
    popupRef.current = popup;

    const onLoad = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: markersToGeoJson(markersRef.current),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 48,
        });

        map.addLayer({
          id: CLUSTER_LAYER,
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#E84208",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              18,
              10,
              22,
              30,
              28,
            ],
            "circle-opacity": 0.9,
          },
        });

        map.addLayer({
          id: CLUSTER_COUNT_LAYER,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          },
          paint: {
            "text-color": "#ffffff",
          },
        });

        map.addLayer({
          id: POINT_LAYER,
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match",
              ["get", "kind"],
              "store",
              KIND_COLOR.store,
              "service",
              KIND_COLOR.service,
              "professional",
              KIND_COLOR.professional,
              "#E84208",
            ],
            "circle-radius": 9,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      map.on("click", CLUSTER_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [CLUSTER_LAYER],
        });
        const feature = features[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        if (clusterId == null || !source) return;
        source.getClusterExpansionZoom(clusterId, (err, expansionZoom) => {
          if (err || expansionZoom == null || !feature.geometry) return;
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];
          map.easeTo({ center: coords, zoom: expansionZoom });
        });
      });

      map.on("click", POINT_LAYER, (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties) return;
        const props = feature.properties;
        const id = String(props.id);
        const marker = markersRef.current.find((m) => m.id === id);
        if (marker) onMarkerClickRef.current?.(marker);

        const coords = (feature.geometry as GeoJSON.Point).coordinates as [
          number,
          number,
        ];
        popup.setLngLat(coords).setHTML(buildPopupHtml(props)).addTo(map);
      });

      map.on("mouseenter", POINT_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", POINT_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });

      onReady?.();
    };

    map.on("load", onLoad);

    return () => {
      popup.remove();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
    // Initialize once per token/container
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(markersToGeoJson(markers));
    }
  }, [markers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      center: [center.longitude, center.latitude],
      zoom,
      duration: 600,
    });
  }, [center.latitude, center.longitude, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !containerRef.current) return;
    const el = containerRef.current;
    const resize = () => {
      try {
        map.resize();
      } catch {
        /* map may be removed */
      }
    };
    resize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    const el = document.createElement("div");
    el.className = "servis-user-marker";
    el.setAttribute("aria-label", "Votre position");
    el.innerHTML = `<span class="servis-user-marker__dot"></span>`;

    if (!userMarkerRef.current) {
      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([
        userLocation.longitude,
        userLocation.latitude,
      ]);
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const popup = popupRef.current;
    if (!map || !popup || !selectedId) return;
    const marker = markers.find((m) => m.id === selectedId);
    if (!marker) return;

    map.easeTo({
      center: [marker.coordinates.longitude, marker.coordinates.latitude],
      zoom: Math.max(map.getZoom(), 14),
      duration: 500,
    });
    popup
      .setLngLat([marker.coordinates.longitude, marker.coordinates.latitude])
      .setHTML(
        buildPopupHtml({
          kind: marker.kind,
          label: marker.label,
          subtitle: marker.subtitle ?? "",
          city: marker.city ?? "",
          distanceKm: marker.distanceKm ?? null,
          priceLabel: marker.priceLabel ?? "",
          href: marker.href ?? "",
        })
      )
      .addTo(map);
  }, [selectedId, markers]);

  if (!token) {
    warnMissingMapboxToken();
    return (
      <div
        className={cn(
          "flex h-full min-h-[280px] items-center justify-center rounded-[18px] border border-cr2 bg-surface-secondary px-6 text-center dark:border-border",
          className
        )}
        data-testid="map-unconfigured"
      >
        <p className="text-body-sm text-text-secondary">
          La carte n&apos;est pas configurée.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full min-h-[280px] w-full overflow-hidden rounded-[18px]",
        className
      )}
      data-testid="map-view"
    />
  );
}
