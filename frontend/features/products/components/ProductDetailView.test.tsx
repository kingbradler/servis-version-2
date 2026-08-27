import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/stores/x/products/y",
}));

vi.mock("@/features/products/hooks/usePublicProduct", () => ({
  usePublicProduct: () => ({
    product: null,
    loading: false,
    error: "Produit introuvable",
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

import { ProductDetailView } from "@/features/products/components/ProductDetailView";

describe("ProductDetailView", () => {
  it("shows error state when product fetch fails", () => {
    render(<ProductDetailView storeSlug="x" productSlug="y" />);
    expect(screen.getByText("Produit introuvable")).toBeInTheDocument();
  });
});
