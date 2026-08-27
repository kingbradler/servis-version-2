import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminSubscriptionsPage from "@/app/admin/subscriptions/page";

vi.mock("@/features/billing/services/billing.service", () => ({
  getAdminSubscriptionPayments: vi.fn().mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: "pay1",
        subscription: "sub1",
        amount: "49.00",
        payment_method: {
          id: "m1",
          name: "Orange Money",
          account_name: "SERVIS",
          account_number: "0600",
          instructions: "",
        },
        status: "PROOF_SUBMITTED",
        reference: "R1",
        proof_url: "https://example.com/proof",
        submitted_at: "2026-01-01",
        reviewed_at: null,
        rejection_reason: "",
        plan_code: "STORE_STANDARD",
        plan_name: "Boutique Standard",
        created_at: "2026-01-01",
        owner_email: "seller@servis.ma",
      },
    ],
  }),
  approveSubscriptionPayment: vi.fn(),
  rejectSubscriptionPayment: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("AdminSubscriptionsPage", () => {
  it("shows approve and reject actions for pending proofs", async () => {
    render(<AdminSubscriptionsPage />);
    expect(await screen.findByText(/seller@servis.ma/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approuver" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refuser" })).toBeInTheDocument();
    expect(screen.getByText(/Voir la preuve/)).toBeInTheDocument();
  });
});
