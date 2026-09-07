import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const getMe = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("next=/admin"),
  usePathname: () => "/login",
}));

vi.mock("@/components/layout/marketplace-shell", () => ({
  MarketplaceShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    login: vi.fn(),
    loading: false,
    error: null,
  }),
}));

vi.mock("@/features/auth/services/auth.service", () => ({
  getMe: (...args: unknown[]) => getMe(...args),
}));

import LoginPage from "@/app/login/page";

describe("Login page", () => {
  beforeEach(() => {
    replace.mockClear();
    getMe.mockReset();
  });

  it("sends an already-authenticated admin to /admin", async () => {
    getMe.mockResolvedValue({
      id: "1",
      email: "admin@test.com",
      first_name: "Ada",
      last_name: "Min",
      phone: "",
      role: "ADMIN",
      avatar: "",
      is_verified: true,
      created_at: "",
      updated_at: "",
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/admin");
    });
  });

  it("keeps the form when nobody is signed in", async () => {
    getMe.mockRejectedValue(new Error("Non authentifié"));

    render(<LoginPage />);

    expect(
      await screen.findAllByRole("heading", { name: "Connexion" })
    ).not.toHaveLength(0);
    await waitFor(() => {
      expect(getMe).toHaveBeenCalled();
    });
    expect(replace).not.toHaveBeenCalled();
  });
});
