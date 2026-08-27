import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const publish = vi.fn();
const archive = vi.fn();
const create = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/seller/services",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/pro-services/hooks/useSellerServices", () => ({
  useSellerServices: () => ({
    services: [
      {
        id: "s1",
        name: "Coupe homme",
        slug: "coupe-homme",
        description: "",
        price: "50.00",
        price_type: "FIXED",
        duration: "30 min",
        status: "DRAFT",
        is_featured: false,
        category: null,
        images: [],
        profile_status: "ACTIVE",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
    create,
    update: vi.fn(),
    archive,
    publish,
  }),
}));

vi.mock("@/features/professionals/hooks/useSellerProfessional", () => ({
  useSellerProfessional: () => ({
    profile: {
      id: "p1",
      display_name: "Pro",
      slug: "pro",
      status: "ACTIVE",
    },
    loading: false,
    missing: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import SellerServicesPage from "@/app/seller/services/page";

describe("SellerServicesPage", () => {
  beforeEach(() => {
    publish.mockReset();
    archive.mockReset();
  });

  it("lists services and can publish / archive", async () => {
    const user = userEvent.setup();
    publish.mockResolvedValue({});
    archive.mockResolvedValue({});
    render(<SellerServicesPage />);
    expect(screen.getByText("Coupe homme")).toBeInTheDocument();
    expect(screen.getByText("Brouillon")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Publier" }));
    expect(publish).toHaveBeenCalledWith("s1");
    await user.click(screen.getByRole("button", { name: "Archiver" }));
    expect(archive).toHaveBeenCalledWith("s1");
  });
});
