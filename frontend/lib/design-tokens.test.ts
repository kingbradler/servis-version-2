import { describe, expect, it } from "vitest";

import { BRAND } from "@/config/brand";
import {
  BADGE_SEMANTICS,
  BUTTON_VARIANTS,
  CARD_FAMILIES,
  COLOR_CORE,
  RADIUS,
} from "@/lib/design-tokens";

describe("design tokens Phase 7.1", () => {
  it("keeps SERVIS orange identity", () => {
    expect(COLOR_CORE.orange).toBe("#E84208");
    expect(COLOR_CORE.orangeBright).toBe("#FF6534");
    expect(BRAND.colors.orange).toBe("#E84208");
  });

  it("uses Syne + DM Sans pairing", async () => {
    const { FONTS } = await import("@/lib/design-tokens");
    expect(FONTS.display).toBe("Syne");
    expect(FONTS.body).toBe("DM Sans");
  });

  it("exposes logo swap paths", () => {
    expect(BRAND.mark.light).toContain("/brand/");
    expect(BRAND.mark.dark).toContain("/brand/");
    expect(BRAND.name).toBe("SERVIS");
  });

  it("defines radius and button hierarchy", () => {
    expect(RADIUS.lg).toBeTruthy();
    expect(BUTTON_VARIANTS).toContain("primary");
    expect(BUTTON_VARIANTS).toContain("danger");
    expect(BUTTON_VARIANTS).toContain("ghost");
  });

  it("lists marketplace card families", () => {
    expect(CARD_FAMILIES).toContain("ProductCard");
    expect(CARD_FAMILIES).toContain("ProfessionalCard");
  });

  it("maps status badges for workflows", () => {
    expect(BADGE_SEMANTICS.PENDING).toBe("warning");
    expect(BADGE_SEMANTICS.FEATURED).toBe("primary");
    expect(BADGE_SEMANTICS.REJECTED).toBe("error");
  });
});
