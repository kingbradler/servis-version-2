import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/features/stores/hooks/usePublicStore", () => ({
  usePublicStore: () => ({
    store: {
      id: "s1",
      name: "Campus Tech",
      slug: "campus-tech",
      description: "Boutique test",
      logo: "",
      banner: "",
      city: { id: "c1", name: "Tanger", slug: "tanger", region: "Nord" },
      phone: "0612345678",
      whatsapp: "212612345678",
      created_at: "2026-01-01T00:00:00Z",
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/products/hooks/usePublicProducts", () => ({
  usePublicProducts: () => ({
    products: [],
    count: 0,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
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

vi.mock("@/features/categories/services/categories.service", () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
}));

import { StoreDetailPage } from "@/features/stores/components/StoreDetailPage";

describe("StoreDetailPage", () => {
  it("renders store header and empty products state", () => {
    render(<StoreDetailPage storeSlug="campus-tech" />);
    expect(
      screen.getByRole("heading", { name: "Campus Tech" })
    ).toBeInTheDocument();
    expect(screen.getByText("Tanger · Nord")).toBeInTheDocument();
    expect(screen.getByText("Boutique test")).toBeInTheDocument();
    expect(screen.getByText("À propos de la boutique")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Cette boutique ne propose actuellement aucun produit"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir les produits" })
    ).toHaveAttribute("href", "/stores/campus-tech/products");
  });
});
