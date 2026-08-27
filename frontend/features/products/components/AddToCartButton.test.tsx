import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/stores/campus-tech/products/laptop-pro",
}));

const addItem = vi.fn().mockResolvedValue({ items_count: 1 });

vi.mock("@/providers/cart-provider", () => ({
  useOptionalCart: () => ({
    isAuthenticated: false,
    authLoading: false,
    addItem,
    itemsCount: 0,
    cart: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { AddToCartButton } from "@/features/products/components/AddToCartButton";

describe("AddToCartButton", () => {
  it("prompts login when anonymous", async () => {
    const user = userEvent.setup();
    render(<AddToCartButton productId="p1" />);
    await user.click(screen.getByRole("button", { name: "Ajouter au panier" }));
    expect(
      screen.getByText("Connexion requise")
    ).toBeInTheDocument();
    expect(addItem).not.toHaveBeenCalled();
  });
});
