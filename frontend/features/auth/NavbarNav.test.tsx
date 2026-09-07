import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock("@/providers/cart-provider", () => ({
  useOptionalCart: () => ({ itemsCount: 0 }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  }),
}));

const useCurrentUser = vi.fn();

vi.mock("@/features/auth/hooks/useCurrentUser", () => ({
  useCurrentUser: () => useCurrentUser(),
}));

import { Navbar } from "@/components/layout/navbar";

describe("Navbar navigation", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows visitor links and connexion", () => {
    useCurrentUser.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
    });
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "Accueil" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Produits" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Services" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorer" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Boutiques" })).toBeTruthy();
    expect(screen.getByLabelText(/panier/i)).toBeTruthy();
    expect(screen.getAllByText("Connexion").length).toBeGreaterThan(0);
  });

  it("shows panier for authenticated client", () => {
    useCurrentUser.mockReturnValue({
      user: {
        id: "1",
        email: "c@t.com",
        first_name: "C",
        last_name: "L",
        role: "CLIENT",
      },
      loading: false,
      isAuthenticated: true,
    });
    render(<Navbar />);
    expect(screen.getByLabelText(/panier/i)).toBeTruthy();
    expect(screen.getByLabelText("Profil")).toBeTruthy();
  });
});
