import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
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

vi.mock("@/features/products/hooks/usePublicProducts", () => ({
  usePublicProducts: () => ({
    products: [
      {
        id: "p1",
        name: "Laptop Pro",
        slug: "laptop-pro",
        description: "Un laptop",
        price: "4500.00",
        compare_price: "5000.00",
        stock: 3,
        status: "ACTIVE",
        is_featured: true,
        store: { name: "Campus Tech", slug: "campus-tech" },
        category: { name: "Informatique", slug: "informatique" },
        images: [],
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
    count: 1,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/pro-services/hooks/usePublicServices", () => ({
  usePublicServices: () => ({
    services: [],
    count: 0,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/stores/hooks/usePublicStores", () => ({
  usePublicStores: () => ({
    stores: [
      {
        id: "s1",
        name: "Campus Tech",
        slug: "campus-tech",
        description: "Tech pour étudiants",
        logo: "",
        banner: "",
        city: { id: "c1", name: "Tanger", slug: "tanger", region: "Nord" },
        phone: "",
        whatsapp: "",
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
    count: 1,
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
    role: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
    isAuthenticated: false,
    isClient: false,
    isSeller: false,
    isAdmin: false,
  }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    logout: vi.fn(),
    login: vi.fn(),
    loading: false,
    error: null,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: { alt?: string; src?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} src={typeof props.src === "string" ? props.src : ""} />
  ),
}));

vi.mock("@/features/categories/services/categories.service", () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
}));

import { HomePage } from "@/features/marketplace/components/HomePage";

describe("HomePage", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it(
    "renders brand, categories and products",
    () => {
      render(<HomePage />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        /Marketplace locale|près de vous/i
      );
      expect(screen.getByText("Explorer par catégorie")).toBeInTheDocument();
      expect(screen.getByText("Informatique")).toBeInTheDocument();
      expect(screen.getByText("Laptop Pro")).toBeInTheDocument();
      expect(screen.getAllByText("Campus Tech").length).toBeGreaterThan(0);
      expect(screen.getByText("Services près de chez vous")).toBeInTheDocument();
      expect(screen.getByText("Pas encore de services publiés")).toBeInTheDocument();
    },
    15000
  );

  it("submits search to /products?search=", async () => {
    const user = userEvent.setup();
    render(<HomePage />);
    const input = screen.getAllByLabelText("Recherche marketplace")[0];
    await user.clear(input);
    await user.type(input, "téléphone");
    const form = input.closest("form");
    expect(form).toBeTruthy();
    form?.requestSubmit();
    expect(push).toHaveBeenCalledWith(
      `/products?search=${encodeURIComponent("téléphone")}`
    );
  });
});
