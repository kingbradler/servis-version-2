import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SellerSubscriptionPage from "@/app/seller/subscription/page";
import { productQuotaLabel } from "@/features/billing/components/BillingBadges";

const getPlans = vi.fn();
const getPlatformPaymentMethods = vi.fn();
const getEntitlements = vi.fn();
const getMySubscriptions = vi.fn();
const createSubscription = vi.fn();
const uploadSubscriptionProof = vi.fn();

vi.mock("@/features/billing/services/billing.service", () => ({
  getPlans: (...args: unknown[]) => getPlans(...args),
  getPlatformPaymentMethods: (...args: unknown[]) =>
    getPlatformPaymentMethods(...args),
  getEntitlements: (...args: unknown[]) => getEntitlements(...args),
  getMySubscriptions: (...args: unknown[]) => getMySubscriptions(...args),
  createSubscription: (...args: unknown[]) => createSubscription(...args),
  uploadSubscriptionProof: (...args: unknown[]) =>
    uploadSubscriptionProof(...args),
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

const storePlan = {
  id: "plan-std",
  code: "STORE_STANDARD",
  name: "Boutique Standard",
  plan_type: "STORE_STANDARD",
  category: "STORE",
  price: "49.00",
  duration_days: 30,
  product_limit: 20,
  product_image_limit: 3,
  service_enabled: false,
  advanced_stats: false,
  visibility_level: 1,
  boosts_allowed: false,
  sort_order: 20,
};

describe("productQuotaLabel", () => {
  it("shows 18 / 20 and unlimited", () => {
    expect(productQuotaLabel(18, 20)).toBe("18 / 20");
    expect(productQuotaLabel(30, null)).toBe("30 / ∞");
  });
});

describe("SellerSubscriptionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPlans.mockResolvedValue([
      {
        ...storePlan,
        id: "free",
        code: "STORE_FREE",
        name: "Boutique Free",
        price: "0.00",
        product_limit: 5,
        sort_order: 10,
      },
      storePlan,
      {
        ...storePlan,
        id: "pro",
        code: "STORE_PRO",
        name: "Boutique Pro",
        price: "99.00",
        product_limit: null,
        boosts_allowed: true,
        advanced_stats: true,
        sort_order: 30,
      },
      {
        ...storePlan,
        id: "svc",
        code: "SERVICE_STANDARD",
        name: "Services Standard",
        category: "SERVICE",
        price: "39.00",
        product_limit: null,
        service_enabled: true,
        sort_order: 40,
      },
    ]);
    getPlatformPaymentMethods.mockResolvedValue([
      {
        id: "m1",
        name: "Orange Money",
        account_name: "SERVIS",
        account_number: "0600000000",
        instructions: "Envoyez puis uploadez",
      },
    ]);
    getEntitlements.mockResolvedValue({
      store: {
        plan_code: "STORE_STANDARD",
        plan_name: "Boutique Standard",
        product_limit: 20,
        product_image_limit: 3,
        active_product_count: 18,
        advanced_stats: false,
        visibility_level: 1,
        boosts_allowed: false,
        subscription_id: "sub1",
        status: "ACTIVE",
        starts_at: null,
        expires_at: null,
        days_remaining: 17,
      },
      services: {
        plan_code: null,
        plan_name: null,
        has_active_subscription: false,
        advanced_stats: false,
        visibility_level: 0,
        boosts_allowed: false,
        subscription_id: null,
        status: null,
        starts_at: null,
        expires_at: null,
        days_remaining: null,
      },
    });
    getMySubscriptions.mockResolvedValue([
      {
        id: "sub1",
        plan: storePlan,
        category: "STORE",
        status: "ACTIVE",
        starts_at: null,
        expires_at: null,
        activated_at: null,
        cancelled_at: null,
        days_remaining: 17,
        latest_payment: {
          id: "pay1",
          subscription: "sub1",
          amount: "49.00",
          payment_method: {
            id: "m1",
            name: "Orange Money",
            account_name: "SERVIS",
            account_number: "0600000000",
            instructions: "",
          },
          status: "APPROVED",
          reference: "",
          proof_url: null,
          submitted_at: null,
          reviewed_at: null,
          rejection_reason: "",
          created_at: "2026-01-01",
        },
        created_at: "2026-01-01",
      },
    ]);
  });

  it("shows active plan quota and upgrade CTA", async () => {
    render(<SellerSubscriptionPage />);
    await waitFor(() => {
      expect(screen.getByText(/18 \/ 20/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Expire dans 17 jours/)).toBeInTheDocument();
    expect(screen.getAllByText(/Boutique Standard/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Choisir" }).length).toBeGreaterThan(0);
  });

  it(
    "shows payment pending notice after choosing a paid plan",
    async () => {
      const user = userEvent.setup();
      createSubscription.mockResolvedValue({
        id: "new-sub",
        plan: storePlan,
        category: "STORE",
        status: "PENDING",
        starts_at: null,
        expires_at: null,
        activated_at: null,
        cancelled_at: null,
        days_remaining: null,
        latest_payment: {
          id: "np",
          subscription: "new-sub",
          amount: "49.00",
          payment_method: {
            id: "m1",
            name: "Orange Money",
            account_name: "SERVIS",
            account_number: "0600000000",
            instructions: "Envoyez",
          },
          status: "PENDING",
          reference: "",
          proof_url: null,
          submitted_at: null,
          reviewed_at: null,
          rejection_reason: "",
          created_at: "2026-01-01",
        },
        created_at: "2026-01-01",
      });

      render(<SellerSubscriptionPage />);
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: "Choisir" }).length).toBeGreaterThan(1)
      );
      const chooseButtons = screen.getAllByRole("button", { name: "Choisir" });
      await user.click(chooseButtons[1]);
      expect(
        await screen.findByText(/vérification manuelle de votre paiement/i)
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: /J'ai payé — continuer/i })
      );
      expect(await screen.findByText(/Envoyer la preuve/i)).toBeInTheDocument();
    },
    15000
  );

  it("shows rejected payment reason", async () => {
    getMySubscriptions.mockResolvedValue([
      {
        id: "sub-r",
        plan: storePlan,
        category: "STORE",
        status: "REJECTED",
        starts_at: null,
        expires_at: null,
        activated_at: null,
        cancelled_at: null,
        days_remaining: null,
        latest_payment: {
          id: "pr",
          subscription: "sub-r",
          amount: "49.00",
          payment_method: {
            id: "m1",
            name: "Orange Money",
            account_name: "SERVIS",
            account_number: "x",
            instructions: "",
          },
          status: "REJECTED",
          reference: "",
          proof_url: null,
          submitted_at: null,
          reviewed_at: null,
          rejection_reason: "Montant incorrect",
          created_at: "2026-01-01",
        },
        created_at: "2026-01-01",
      },
    ]);
    render(<SellerSubscriptionPage />);
    expect(await screen.findByText(/Montant incorrect/)).toBeInTheDocument();
  });
});
