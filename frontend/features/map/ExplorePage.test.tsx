import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
  usePathname: () => "/explore",
  useSearchParams: () => new URLSearchParams("type=stores"),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    function MockMap(props: { markers?: unknown[]; selectedId?: string | null }) {
      return (
        <div data-testid="map-view">
          map:{Array.isArray(props.markers) ? props.markers.length : 0}
          {props.selectedId ? `:sel:${props.selectedId}` : ""}
        </div>
      );
    }
    return MockMap;
  },
}));

vi.mock("@/providers/cart-provider", () => ({
  useOptionalCart: () => null,
}));

vi.mock("@/features/auth/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: null,
    loading: false,
    isAuthenticated: false,
  }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock("@/features/stores/services/stores.service", () => ({
  getPublicStores: vi.fn().mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: "s1",
        name: "Boutique ABC",
        slug: "boutique-abc",
        description: "Téléphones",
        logo: "",
        banner: "",
        city: { id: "1", name: "Tanger", slug: "tanger", region: "Nord" },
        phone: "",
        whatsapp: "",
        latitude: 35.76,
        longitude: -5.83,
        location: {
          address: "",
          city: "Tanger",
          neighborhood: "",
          postal_code: "",
          latitude: 35.76,
          longitude: -5.83,
        },
        distance_km: 1.2,
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
  }),
}));

vi.mock("@/features/pro-services/api/services.api", () => ({
  getPublicServices: vi.fn().mockResolvedValue({ count: 0, results: [] }),
  formatServicePrice: () => "100 MAD",
}));

vi.mock("@/features/professionals/api/professionals.api", () => ({
  getPublicProfessionals: vi.fn().mockResolvedValue({ count: 0, results: [] }),
}));

vi.mock("@/features/map/components/AroundMeButton", () => ({
  AroundMeButton: ({
    onLocated,
  }: {
    onLocated: (c: { latitude: number; longitude: number }, r: number) => void;
  }) => (
    <button
      type="button"
      onClick={() => onLocated({ latitude: 35.76, longitude: -5.83 }, 10)}
    >
      Trouver autour de moi
    </button>
  ),
}));

import ExplorePage from "@/app/explore/page";

describe("Explore page", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "loads stores and syncs list selection with map",
    async () => {
      const user = userEvent.setup();
      render(<ExplorePage />);
      expect(
        await screen.findByText(/Boutique ABC/, {}, { timeout: 10000 })
      ).toBeInTheDocument();
      expect(screen.getByTestId("map-view")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /Boutique ABC/i }));
      expect(screen.getByTestId("map-view").textContent).toMatch(/sel:store:s1/);
    },
    15000
  );

  it("triggers around-me navigation", async () => {
    const user = userEvent.setup();
    render(<ExplorePage />);
    await screen.findByText(/Boutique ABC/);
    await user.click(
      screen.getByRole("button", { name: /Trouver autour de moi/i })
    );
    expect(push).toHaveBeenCalled();
    const href = String(push.mock.calls.at(-1)?.[0] ?? "");
    expect(href).toContain("latitude=");
    expect(href).toContain("longitude=");
  });
});
