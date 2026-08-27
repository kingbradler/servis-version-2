import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("mapbox-gl", () => {
  class Map {
    on = vi.fn();
    remove = vi.fn();
    addControl = vi.fn();
    addSource = vi.fn();
    addLayer = vi.fn();
    getSource = vi.fn();
    getCanvas = vi.fn(() => ({ style: {} }));
    easeTo = vi.fn();
    getZoom = vi.fn(() => 12);
    queryRenderedFeatures = vi.fn(() => []);
  }
  class Popup {
    setLngLat = vi.fn().mockReturnThis();
    setHTML = vi.fn().mockReturnThis();
    addTo = vi.fn().mockReturnThis();
    remove = vi.fn();
  }
  class Marker {
    setLngLat = vi.fn().mockReturnThis();
    addTo = vi.fn().mockReturnThis();
    remove = vi.fn();
  }
  class NavigationControl {}
  return {
    default: {
      Map,
      Popup,
      Marker,
      NavigationControl,
      accessToken: "",
    },
  };
});

vi.mock("../token", () => ({
  getMapboxToken: () => null,
  isMapboxConfigured: () => false,
  warnMissingMapboxToken: vi.fn(),
}));

import { MapView } from "./components/MapView";
import type { MapMarker } from "./types";

const sampleMarker: MapMarker = {
  id: "store:1",
  kind: "store",
  coordinates: { latitude: 35.76, longitude: -5.83 },
  label: "Boutique ABC",
  city: "Tanger",
  distanceKm: 1.4,
  href: "/stores/abc",
};

describe("MapView", () => {
  afterEach(() => cleanup());

  it("renders unconfigured state without token", () => {
    render(<MapView markers={[sampleMarker]} accessToken={null} />);
    expect(screen.getByTestId("map-unconfigured")).toHaveTextContent(
      /n'est pas configurée/i
    );
  });

  it("renders map container when token is present", () => {
    render(
      <MapView
        markers={[sampleMarker]}
        accessToken="pk.test-token"
        userLocation={{ latitude: 35.76, longitude: -5.83 }}
        selectedId="store:1"
      />
    );
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
  });
});
