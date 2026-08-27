import { describe, expect, it } from "vitest";
import { Package, Smartphone } from "lucide-react";

import { resolveCategoryIcon } from "@/lib/marketplace/category-icons";

describe("resolveCategoryIcon", () => {
  it("resolves known lucide icon names", () => {
    expect(resolveCategoryIcon("smartphone")).toBe(Smartphone);
  });

  it("falls back to Package", () => {
    expect(resolveCategoryIcon(undefined)).toBe(Package);
    expect(resolveCategoryIcon("unknown-icon")).toBe(Package);
  });
});
