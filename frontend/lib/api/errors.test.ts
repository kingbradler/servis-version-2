import { describe, expect, it } from "vitest";

import {
  ApiError,
  getUserFacingErrorMessage,
  messageFromApiBody,
} from "@/lib/api/errors";

describe("user-facing API errors", () => {
  it("maps service_subscription_required to a clear message", () => {
    const msg = messageFromApiBody(
      {
        detail: "tech detail",
        fields: { error_code: "service_subscription_required" },
      },
      400
    );
    expect(msg.toLowerCase()).toContain("abonnement");
    expect(msg.toLowerCase()).not.toContain("erreur api");
  });

  it("reads nested field validation messages", () => {
    const msg = messageFromApiBody(
      {
        detail: { image: ["Trop de photos pour votre offre."] },
        code: "invalid",
        fields: null,
      },
      400
    );
    expect(msg).toContain("Trop de photos");
  });

  it("never returns Erreur API fallback", () => {
    const err = new ApiError("Erreur API", 500, null);
    const msg = getUserFacingErrorMessage(err);
    expect(msg.toLowerCase()).not.toContain("erreur api");
    expect(msg.length).toBeGreaterThan(10);
  });

  it("softens technical paths", () => {
    const msg = messageFromApiBody({
      detail: "Requis. Souscrivez via /seller/subscription.",
    });
    expect(msg.toLowerCase()).not.toContain("/seller/");
  });
});
