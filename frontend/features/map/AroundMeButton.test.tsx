import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AroundMeButton } from "./components/AroundMeButton";
import { FillCoordinatesButton, formatCoordinate } from "./components/FillCoordinatesButton";
import { LocationLabel } from "./components/LocationLabel";
import * as geo from "./geolocation";

describe("LocationLabel", () => {
  afterEach(() => cleanup());

  it("renders city location", () => {
    render(<LocationLabel city="Tanger" />);
    expect(screen.getByText(/Tanger/)).toBeInTheDocument();
  });

  it("renders nothing without city", () => {
    const { container } = render(<LocationLabel />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("FillCoordinatesButton", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("fills coordinates via onLocated", async () => {
    const user = userEvent.setup();
    vi.spyOn(geo, "requestUserLocation").mockResolvedValue({
      latitude: 35.7595,
      longitude: -5.834,
    });
    const onLocated = vi.fn();
    render(<FillCoordinatesButton onLocated={onLocated} />);
    await user.click(
      screen.getByRole("button", { name: /Utiliser ma position/i })
    );
    expect(onLocated).toHaveBeenCalledWith({
      latitude: 35.7595,
      longitude: -5.834,
    });
  });

  it("formats coordinates to 6 decimals", () => {
    expect(formatCoordinate(35.75951234)).toBe("35.759512");
  });
});

describe("AroundMeButton", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("calls onLocated when permission granted", async () => {
    const user = userEvent.setup();
    vi.spyOn(geo, "requestUserLocation").mockResolvedValue({
      latitude: 35.76,
      longitude: -5.83,
    });
    const onLocated = vi.fn();
    render(<AroundMeButton onLocated={onLocated} radiusKm={5} />);
    await user.click(
      screen.getByRole("button", { name: /Trouver autour de moi/i })
    );
    expect(onLocated).toHaveBeenCalledWith(
      { latitude: 35.76, longitude: -5.83 },
      5
    );
  });

  it("shows error when permission denied", async () => {
    const user = userEvent.setup();
    vi.spyOn(geo, "requestUserLocation").mockRejectedValue(
      new geo.GeolocationRequestError(
        "permission_denied",
        "Impossible d'obtenir votre position. Vous pouvez continuer à explorer la carte."
      )
    );
    render(<AroundMeButton onLocated={vi.fn()} />);
    await user.click(
      screen.getByRole("button", { name: /Trouver autour de moi/i })
    );
    expect(
      await screen.findByText(/Impossible d'obtenir votre position/)
    ).toBeInTheDocument();
  });
});
