import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/products",
  useSearchParams: () =>
    new URLSearchParams("category=informatique&min_price=100"),
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

vi.mock("@/features/categories/hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [
      {
        id: "1",
        name: "Informatique",
        slug: "informatique",
        description: "",
        icon: "laptop",
        parent: null,
        order: 1,
        children: [],
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/cities/hooks/useCities", () => ({
  useCities: () => ({
    cities: [{ id: "1", name: "Tanger", slug: "tanger", region: "Nord" }],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/stores/hooks/usePublicStores", () => ({
  usePublicStores: () => ({
    stores: [],
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

import ProductsPage from "@/app/products/page";

describe("Products catalog empty + filters", () => {
  it("shows empty state and filter controls synced from URL", async () => {
    render(<ProductsPage />);
    expect(screen.getByText("Aucun produit trouvé")).toBeInTheDocument();
    const categorySelects = screen.getAllByLabelText("Catégorie");
    expect(categorySelects[0]).toHaveValue("informatique");
    const minPrice = screen.getAllByLabelText("Prix min");
    expect(minPrice[0]).toHaveValue(100);
    // Allow debounce effect cleanup before teardown
    await new Promise((r) => setTimeout(r, 450));
  });
});
