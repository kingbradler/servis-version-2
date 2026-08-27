import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/seller",
}));

vi.mock("@/features/auth/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { RequireAuth } from "@/features/auth/components/RequireAuth";

describe("RequireAuth", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("redirects anonymous users to login", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: null,
      role: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
      isAuthenticated: false,
      isClient: false,
      isSeller: false,
      isAdmin: false,
    });

    render(
      <RequireAuth roles={["SELLER"]}>
        <div>Secret</div>
      </RequireAuth>
    );

    expect(replace).toHaveBeenCalledWith("/login?next=%2Fseller");
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("allows matching role", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: {
        id: "1",
        email: "s@test.com",
        first_name: "S",
        last_name: "E",
        phone: "",
        role: "SELLER",
        avatar: "",
        is_verified: true,
        created_at: "",
        updated_at: "",
      },
      role: "SELLER",
      loading: false,
      error: null,
      refresh: vi.fn(),
      isAuthenticated: true,
      isClient: false,
      isSeller: true,
      isAdmin: false,
    });

    render(
      <RequireAuth roles={["SELLER"]}>
        <div>Secret</div>
      </RequireAuth>
    );

    expect(screen.getByText("Secret")).toBeInTheDocument();
  });

  it("sends CLIENT away from seller area", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: {
        id: "1",
        email: "c@test.com",
        first_name: "C",
        last_name: "L",
        phone: "",
        role: "CLIENT",
        avatar: "",
        is_verified: true,
        created_at: "",
        updated_at: "",
      },
      role: "CLIENT",
      loading: false,
      error: null,
      refresh: vi.fn(),
      isAuthenticated: true,
      isClient: true,
      isSeller: false,
      isAdmin: false,
    });

    render(
      <RequireAuth roles={["SELLER"]}>
        <div>Secret</div>
      </RequireAuth>
    );

    expect(replace).toHaveBeenCalledWith("/403");
  });

  it("sends SELLER away from admin area", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: {
        id: "1",
        email: "s@test.com",
        first_name: "S",
        last_name: "E",
        phone: "",
        role: "SELLER",
        avatar: "",
        is_verified: true,
        created_at: "",
        updated_at: "",
      },
      role: "SELLER",
      loading: false,
      error: null,
      refresh: vi.fn(),
      isAuthenticated: true,
      isClient: false,
      isSeller: true,
      isAdmin: false,
    });

    render(
      <RequireAuth roles={["ADMIN"]}>
        <div>Admin</div>
      </RequireAuth>
    );

    expect(replace).toHaveBeenCalledWith("/403");
  });
});
