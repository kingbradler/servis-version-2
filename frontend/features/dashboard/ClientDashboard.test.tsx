import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/features/auth/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: {
      id: "1",
      email: "client@test.com",
      first_name: "Romaric",
      last_name: "Test",
      phone: "0600000000",
      role: "CLIENT",
      avatar: "",
      is_verified: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    role: "CLIENT",
    loading: false,
    isAuthenticated: true,
    isClient: true,
    isSeller: false,
    isAdmin: false,
    refresh: vi.fn(),
    error: null,
  }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock("@/features/orders/hooks/useMyOrders", () => ({
  useMyOrders: () => ({
    orders: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    checkout: vi.fn(),
  }),
}));

vi.mock("@/providers/cart-provider", () => ({
  useOptionalCart: () => ({
    itemsCount: 2,
    isAuthenticated: true,
    authLoading: false,
  }),
}));

vi.mock("@/features/payments/services/payments.service", () => ({
  getOrderPayment: vi.fn(),
}));

vi.mock("@/features/pro-services/api/service-requests.api", () => ({
  getMyServiceRequests: vi.fn().mockResolvedValue({
    count: 0,
    next: null,
    previous: null,
    results: [],
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn(), resolvedTheme: "light" }),
}));

import ClientDashboardPage from "@/app/dashboard/page";

describe("Client dashboard", () => {
  it(
    "shows greeting, empty orders and service requests section",
    async () => {
      render(<ClientDashboardPage />);
      expect(screen.getByText(/Bonjour Romaric/)).toBeInTheDocument();
      expect(
        screen.getByText("Aucune commande pour le moment")
      ).toBeInTheDocument();
      expect(
        await screen.findByText(/aucune demande de service/i, {}, { timeout: 8000 })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /voir mes demandes/i })
      ).toBeInTheDocument();
    },
    15000
  );
});
