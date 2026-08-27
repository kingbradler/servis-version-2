import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/users",
}));

vi.mock("@/features/auth/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: {
      id: "admin-1",
      email: "admin@test.com",
      first_name: "Ada",
      last_name: "Min",
      phone: "",
      role: "ADMIN",
      avatar: "",
      is_verified: true,
      created_at: "",
      updated_at: "",
    },
    role: "ADMIN",
    loading: false,
    isAuthenticated: true,
    refresh: vi.fn(),
    error: null,
    isClient: false,
    isSeller: false,
    isAdmin: true,
  }),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  }),
}));

vi.mock("@/features/admin/services/admin.service", () => ({
  getAdminUsers: vi.fn(async () => ({
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: "u1",
        email: "client@test.com",
        first_name: "Client",
        last_name: "One",
        phone: "",
        role: "CLIENT",
        avatar: "",
        is_active: true,
        is_verified: false,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
  })),
  updateAdminUser: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import AdminUsersPage from "@/app/admin/users/page";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { adminNav } from "@/features/dashboard/nav";

describe("Admin users page", () => {
  it("lists users from admin API", async () => {
    render(
      <RequireAuth roles={["ADMIN"]}>
        <DashboardShell title="Admin" items={adminNav}>
          <AdminUsersPage />
        </DashboardShell>
      </RequireAuth>
    );
    await waitFor(() => {
      expect(screen.getByText("client@test.com")).toBeInTheDocument();
    });
    expect(screen.getByText(/Désactiver/i)).toBeInTheDocument();
  });
});
