import { describe, expect, it } from "vitest";

import { phoneDigits, resolveDeliveryAddress } from "./delivery-fields";

describe("phoneDigits", () => {
  it("keeps ASCII mobile numbers", () => {
    expect(phoneDigits("06 12 34 56 78")).toBe("0612345678");
    expect(phoneDigits("+212612345678")).toBe("212612345678");
  });

  it("maps Arabic-Indic digits", () => {
    expect(phoneDigits("٠٦١٢٣٤٥٦٧٨")).toBe("0612345678");
  });
});

describe("resolveDeliveryAddress", () => {
  it("uses the city when the street is empty", () => {
    expect(resolveDeliveryAddress("", "Tanger")).toBe("Tanger");
    expect(resolveDeliveryAddress("  ", "Fes")).toBe("Fes");
  });

  it("keeps a real street line", () => {
    expect(resolveDeliveryAddress("Hay Riad, rue 12", "Rabat")).toBe(
      "Hay Riad, rue 12"
    );
  });
});
