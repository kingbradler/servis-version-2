import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { ProfessionalCard } from "@/components/ui/professional-card";

describe("ProfessionalCard", () => {
  afterEach(() => cleanup());

  it("renders name, headline and profile link", () => {
    render(
      <ProfessionalCard
        displayName="Jean Pro"
        slug="jean-pro"
        headline="Plombier"
        city="Tanger"
        serviceCount={3}
      />
    );
    expect(screen.getByText("Jean Pro")).toBeInTheDocument();
    expect(screen.getByText("Plombier")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/professionals/jean-pro"
    );
  });
});
