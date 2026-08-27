import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
    store: {
      id: "s1",
      name: "Ma Boutique",
      slug: "ma-boutique",
      description: "Desc",
      logo: "",
      banner: "",
      city: { id: "c1", name: "Tanger", slug: "tanger", region: "Nord" },
      phone: "",
      whatsapp: "",
      status: "ACTIVE",
      created_at: "",
      updated_at: "",
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/professionals/hooks/useSellerProfessional", () => ({
  useSellerProfessional: () => ({
    profile: {
      id: "p1",
      display_name: "Sam Pro",
      slug: "sam-pro",
      headline: "Plombier",
      bio: "",
      city: { id: "c1", name: "Tanger", slug: "tanger", region: "Nord" },
      phone: "",
      whatsapp: "",
      avatar: "",
      cover: "",
      status: "ACTIVE",
      created_at: "",
      updated_at: "",
    },
    loading: false,
    missing: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/stores/services/stores.service", () => ({
  getSellerStats: vi.fn().mockResolvedValue({
    store: {
      id: "s1",
      name: "Ma Boutique",
      slug: "ma-boutique",
      status: "ACTIVE",
    },
    products_count: 2,
    products_active: 2,
    orders_count: 1,
    orders_pending: 1,
    payments_proof_submitted: 0,
    payments_confirmed: 0,
  }),
}));

vi.mock("@/features/pro-services/api/services.api", () => ({
  getSellerServices: vi.fn().mockResolvedValue([
    {
      id: "svc1",
      name: "Fuite",
      status: "ACTIVE",
      price: "100",
      price_type: "FIXED",
    },
  ]),
}));

vi.mock("@/features/pro-services/api/service-requests.api", () => ({
  getSellerServiceRequests: vi.fn().mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    results: [{ id: "r1", status: "PENDING" }],
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
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { sellerNav } from "@/features/dashboard/nav";

describe("Seller dashboard", () => {
  it("shows store, services and stats for complete professional", async () => {
    render(
      <RequireAuth roles={["SELLER"]}>
        <DashboardShell title="Professionnel" items={sellerNav}>
          <SellerDashboardPage />
        </DashboardShell>
      </RequireAuth>
    );
    expect(await screen.findByText("Ma Boutique")).toBeInTheDocument();
    expect(await screen.findByText("Sam Pro")).toBeInTheDocument();
    expect(screen.getByText("Espace professionnel")).toBeInTheDocument();
  });
});
