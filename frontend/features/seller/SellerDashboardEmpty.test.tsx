import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/seller",
}));

vi.mock("@/features/auth/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: {
      id: "1",
      email: "seller@test.com",
      first_name: "Sam",
      last_name: "Seller",
      phone: "",
      role: "SELLER",
      avatar: "",
      is_verified: true,
      can_shop: true,
      has_store: false,
      has_professional_profile: false,
      created_at: "",
      updated_at: "",
    },
    role: "SELLER",
    loading: false,
    isAuthenticated: true,
    refresh: vi.fn(),
    error: null,
    isClient: false,
    isSeller: true,
    isAdmin: false,
  }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock("@/features/stores/hooks/useSellerStore", () => ({
  useSellerStore: () => ({
    store: null,
    loading: false,
    error: "Pas de boutique",
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/professionals/hooks/useSellerProfessional", () => ({
  useSellerProfessional: () => ({
    profile: null,
    loading: false,
    missing: true,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/stores/services/stores.service", () => ({
  getSellerStats: vi.fn().mockRejectedValue({ status: 404, message: "none" }),
}));

vi.mock("@/features/pro-services/api/services.api", () => ({
  getSellerServices: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/pro-services/api/service-requests.api", () => ({
  getSellerServiceRequests: vi.fn().mockResolvedValue({
    count: 0,
    next: null,
    previous: null,
    results: [],
  }),
}));

vi.mock("@/features/billing/hooks/useEntitlements", () => ({
  useEntitlements: () => ({
    entitlements: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  }),
}));

import SellerDashboardPage from "@/app/seller/page";

describe("Seller dashboard without store/services", () => {
  afterEach(() => {
    cleanup();
  });

  it(
    "shows create boutique and create professional CTAs",
    async () => {
      render(<SellerDashboardPage />);
      expect(
        await screen.findByText(/vous n'avez pas encore de boutique/i, {}, {
          timeout: 10000,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /créer une boutique/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/vous ne proposez pas encore de services/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /créer mon profil professionnel/i })
      ).toBeInTheDocument();
    },
    15000
  );
});
