import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, refresh: vi.fn() }),
  usePathname: () => "/services",
  useParams: () => ({ serviceSlug: "svc-1" }),
  useSearchParams: () =>
    new URLSearchParams("category=plomberie&city=tanger&ordering=price"),
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
  useAuth: () => ({ logout: vi.fn(), login: vi.fn(), loading: false, error: null }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/categories/services/categories.service", () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/categories/hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [
      {
        id: "1",
        name: "Services",
        slug: "services",
        description: "",
        icon: "handshake",
        parent: null,
        order: 1,
        children: [
          {
            id: "2",
            name: "Plomberie",
            slug: "plomberie",
            description: "",
            icon: "wrench",
            order: 1,
          },
        ],
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

const mockService = {
  id: "svc-1",
  name: "Réparation plomberie",
  slug: "reparation-plomberie",
  description: "Intervention rapide",
  price: "100.00",
  price_type: "FROM" as const,
  duration: "1 h",
  is_featured: true,
  professional: {
    id: "p1",
    display_name: "Jean Pro",
    slug: "jean-pro",
    headline: "Plombier",
    phone: "+212612345678",
    whatsapp: "",
    avatar: "",
    city_name: "Tanger",
    city_slug: "tanger",
  },
  category: { name: "Plomberie", slug: "plomberie" },
  images: [],
  primary_image: null,
  created_at: "2026-01-01T00:00:00Z",
};

const quoteService = {
  ...mockService,
  id: "svc-2",
  name: "Audit complet",
  price: null,
  price_type: "QUOTE" as const,
  is_featured: false,
  duration: "",
};

const usePublicServicesMock = vi.fn();

vi.mock("@/features/pro-services/hooks/usePublicServices", () => ({
  usePublicServices: (filters?: unknown) => usePublicServicesMock(filters),
  usePublicService: () => ({
    service: mockService,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

import PublicServicesPage from "@/app/services/page";
import PublicServiceDetailPage from "@/app/services/[serviceSlug]/page";
import { ServiceCard } from "@/features/pro-services/components/ServiceCard";
import { formatServicePrice } from "@/features/pro-services/api/services.api";

describe("formatServicePrice", () => {
  it("formats FIXED, FROM and QUOTE", () => {
    expect(formatServicePrice("50.00", "FIXED")).toMatch(/50/);
    expect(formatServicePrice("100.00", "FROM")).toMatch(/partir/i);
    expect(formatServicePrice(null, "QUOTE")).toBe("Sur devis");
  });
});

describe("ServiceCard", () => {
  afterEach(() => cleanup());

  it("shows professional, price and featured badge", () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByText("Réparation plomberie")).toBeInTheDocument();
    expect(screen.getByText(/Jean Pro/)).toBeInTheDocument();
    expect(screen.getByText(/Tanger/)).toBeInTheDocument();
    expect(screen.getByText("Plomberie")).toBeInTheDocument();
    expect(screen.getByText("Mis en avant")).toBeInTheDocument();
    expect(screen.getByText(/partir/i)).toBeInTheDocument();
  });

  it("shows Sur devis for QUOTE", () => {
    render(<ServiceCard service={quoteService} />);
    expect(screen.getByText("Sur devis")).toBeInTheDocument();
  });
});

describe("Public services catalog", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    usePublicServicesMock.mockReturnValue({
      services: [mockService],
      count: 1,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it("renders list with filters synced from URL", async () => {
    render(<PublicServicesPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Trouver un service/i
    );
    expect(screen.getByText("Réparation plomberie")).toBeInTheDocument();
    expect(screen.getByText(/Jean Pro/)).toBeInTheDocument();
    const categorySelects = screen.getAllByLabelText("Catégorie");
    expect(categorySelects[0]).toHaveValue("plomberie");
    const citySelects = screen.getAllByLabelText("Ville");
    expect(citySelects[0]).toHaveValue("tanger");
    const ordering = screen.getAllByLabelText("Tri");
    expect(ordering[0]).toHaveValue("price");
    await new Promise((r) => setTimeout(r, 450));
  });

  it("shows loading skeletons", () => {
    usePublicServicesMock.mockReturnValue({
      services: [],
      count: 0,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    const { container } = render(<PublicServicesPage />);
    expect(container.querySelectorAll("[class*='animate']").length).toBeGreaterThan(0);
  });

  it("shows empty state", () => {
    usePublicServicesMock.mockReturnValue({
      services: [],
      count: 0,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<PublicServicesPage />);
    expect(screen.getByText("Aucun service trouvé")).toBeInTheDocument();
  });

  it("shows error state", () => {
    usePublicServicesMock.mockReturnValue({
      services: [],
      count: 0,
      loading: false,
      error: "Erreur réseau",
      refresh: vi.fn(),
    });
    render(<PublicServicesPage />);
    expect(screen.getByText(/Erreur réseau/)).toBeInTheDocument();
  });

  it("renders service detail with contact CTA", () => {
    render(<PublicServiceDetailPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Réparation plomberie" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Demander ce service/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Contacter le professionnel/i })
    ).toHaveAttribute("href", "tel:+212612345678");
  });
});
