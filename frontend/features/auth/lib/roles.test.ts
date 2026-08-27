import { describe, expect, it } from "vitest";

import {
  canAccessAdminArea,
  canAccessClientDashboard,
  canAccessSellerArea,
  canShop,
  getHomePathForRole,
  getRoleLabel,
  isSafeNextPath,
  resolvePostLoginPath,
} from "@/features/auth/lib/roles";

describe("role routing helpers", () => {
  it("maps roles to home paths", () => {
    expect(getHomePathForRole("CLIENT")).toBe("/dashboard");
    expect(getHomePathForRole("SELLER")).toBe("/seller");
    expect(getHomePathForRole("ADMIN")).toBe("/admin");
    expect(getHomePathForRole(null)).toBe("/");
  });

  it("gates areas correctly (UX only)", () => {
    expect(canAccessSellerArea("CLIENT")).toBe(false);
    expect(canAccessSellerArea("SELLER")).toBe(true);
    expect(canAccessAdminArea("SELLER")).toBe(false);
    expect(canAccessAdminArea("ADMIN")).toBe(true);
    expect(canAccessClientDashboard("CLIENT")).toBe(true);
    expect(canAccessClientDashboard("SELLER")).toBe(true);
    expect(canAccessClientDashboard("ADMIN")).toBe(true);
  });

  it("labels SELLER as Professionnel", () => {
    expect(getRoleLabel("SELLER")).toBe("Professionnel");
    expect(getRoleLabel("CLIENT")).toBe("Client");
  });

  it("canShop uses flag or role", () => {
    expect(
      canShop({
        id: "1",
        email: "a@b.c",
        first_name: "A",
        last_name: "B",
        phone: "",
        role: "SELLER",
        avatar: "",
        is_verified: true,
        can_shop: true,
        created_at: "",
        updated_at: "",
      })
    ).toBe(true);
    expect(canShop(null)).toBe(false);
  });

  it("respects safe next and role barriers", () => {
    expect(isSafeNextPath("/services/abc")).toBe(true);
    expect(isSafeNextPath("//evil.com")).toBe(false);
    expect(isSafeNextPath("/")).toBe(false);
    expect(resolvePostLoginPath("CLIENT", "/services/uuid")).toBe(
      "/services/uuid"
    );
    expect(resolvePostLoginPath("CLIENT", "/seller")).toBe("/dashboard");
    expect(resolvePostLoginPath("SELLER", "/cart")).toBe("/cart");
    expect(resolvePostLoginPath("SELLER", null)).toBe("/seller");
    expect(resolvePostLoginPath("ADMIN", "/admin/users")).toBe("/admin/users");
    expect(resolvePostLoginPath("CLIENT", "/admin")).toBe("/dashboard");
  });
});
