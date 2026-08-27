import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ClientServiceRequestsPage from "@/app/dashboard/service-requests/page";
import ClientServiceRequestDetailPage from "@/app/dashboard/service-requests/[id]/page";
import SellerServiceRequestsPage from "@/app/seller/service-requests/page";
import SellerServiceRequestDetailPage from "@/app/seller/service-requests/[id]/page";
import { ServiceRequestForm } from "@/features/pro-services/components/ServiceRequestForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/services/svc-1",
  useParams: () => ({ id: "req-1", serviceSlug: "svc-1" }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/auth/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: { id: "u1", email: "c@servis.ma", role: "CLIENT" },
    role: "CLIENT",
    loading: false,
    error: null,
    refresh: vi.fn(),
    isAuthenticated: true,
    isClient: true,
    isSeller: false,
    isAdmin: false,
  }),
}));

vi.mock("@/features/auth/components/RequireAuth", () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const createServiceRequest = vi.fn();
const getMyServiceRequests = vi.fn();
const getMyServiceRequest = vi.fn();
const cancelServiceRequest = vi.fn();
const getSellerServiceRequests = vi.fn();
const getSellerServiceRequest = vi.fn();
const acceptServiceRequest = vi.fn();
const rejectServiceRequest = vi.fn();
const completeServiceRequest = vi.fn();

vi.mock("@/features/pro-services/api/service-requests.api", () => ({
  createServiceRequest: (...args: unknown[]) => createServiceRequest(...args),
  getMyServiceRequests: (...args: unknown[]) => getMyServiceRequests(...args),
  getMyServiceRequest: (...args: unknown[]) => getMyServiceRequest(...args),
  cancelServiceRequest: (...args: unknown[]) => cancelServiceRequest(...args),
  getSellerServiceRequests: (...args: unknown[]) =>
    getSellerServiceRequests(...args),
  getSellerServiceRequest: (...args: unknown[]) =>
    getSellerServiceRequest(...args),
  acceptServiceRequest: (...args: unknown[]) => acceptServiceRequest(...args),
  rejectServiceRequest: (...args: unknown[]) => rejectServiceRequest(...args),
  completeServiceRequest: (...args: unknown[]) =>
    completeServiceRequest(...args),
  getAdminServiceRequests: vi.fn(),
}));

const sampleRequest = {
  id: "req-1",
  service: {
    id: "svc-1",
    name: "Réparation fuite",
    slug: "reparation",
    price: "100.00",
    price_type: "FIXED",
  },
  client: {
    id: "u1",
    email: "c@servis.ma",
    first_name: "Client",
    last_name: "Test",
  },
  professional: {
    id: "pro-1",
    display_name: "Jean Pro",
    slug: "jean-pro",
    phone: "+212612345678",
    whatsapp: "+212612345678",
    city_name: "Tanger",
  },
  status: "PENDING" as const,
  message: "Bonjour, j'aimerais avoir ce service.",
  requested_date: "2026-08-20",
  requested_time: "14:00:00",
  address: "Rue de la Kasbah",
  phone: "+212698765432",
  created_at: "2026-08-11T10:00:00Z",
  updated_at: "2026-08-11T10:00:00Z",
};

describe("ServiceRequestForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("opens form and shows no-payment notice", () => {
    render(
      <ServiceRequestForm serviceId="svc-1" serviceName="Réparation fuite" />
    );
    fireEvent.click(screen.getByRole("button", { name: /demander ce service/i }));
    expect(
      screen.getByText(/aucun paiement n'est demandé à cette étape/i)
    ).toBeTruthy();
    expect(screen.getByLabelText(/message/i)).toBeTruthy();
  });

  it("submits and shows success", async () => {
    createServiceRequest.mockResolvedValue(sampleRequest);
    render(
      <ServiceRequestForm serviceId="svc-1" serviceName="Réparation fuite" />
    );
    fireEvent.click(screen.getByRole("button", { name: /demander ce service/i }));
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Bonjour, j'aimerais avoir ce service." },
    });
    fireEvent.change(screen.getByLabelText(/^adresse$/i), {
      target: { value: "Rue de la Kasbah" },
    });
    fireEvent.change(screen.getByLabelText(/téléphone/i), {
      target: { value: "+212698765432" },
    });
    fireEvent.click(screen.getByRole("button", { name: /envoyer la demande/i }));
    await waitFor(() => {
      expect(createServiceRequest).toHaveBeenCalled();
      expect(
        screen.getByText(/votre demande a été envoyée au professionnel/i)
      ).toBeTruthy();
    });
  });
});

describe("Client service requests list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading then list with status", async () => {
    getMyServiceRequests.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleRequest],
    });
    render(<ClientServiceRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText("Réparation fuite")).toBeTruthy();
      expect(screen.getByText("En attente")).toBeTruthy();
    });
  });

  it("shows empty state", async () => {
    getMyServiceRequests.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    render(<ClientServiceRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText(/aucune demande/i)).toBeTruthy();
    });
  });

  it("shows error state", async () => {
    getMyServiceRequests.mockRejectedValue(new Error("Erreur réseau"));
    render(<ClientServiceRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText(/erreur de chargement/i)).toBeTruthy();
    });
  });
});

describe("Client service request detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows detail and cancel for PENDING", async () => {
    getMyServiceRequest.mockResolvedValue(sampleRequest);
    cancelServiceRequest.mockResolvedValue({
      ...sampleRequest,
      status: "CANCELLED",
    });
    window.confirm = vi.fn(() => true);
    render(<ClientServiceRequestDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Réparation fuite")).toBeTruthy();
      expect(screen.getByText("En attente")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: /annuler la demande/i }));
    await waitFor(() => {
      expect(cancelServiceRequest).toHaveBeenCalledWith("req-1");
    });
  });
});

describe("Seller service requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("lists requests with status", async () => {
    getSellerServiceRequests.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleRequest],
    });
    render(<SellerServiceRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText("Réparation fuite")).toBeTruthy();
      expect(screen.getByText("En attente")).toBeTruthy();
    });
  });

  it("accept / reject actions with confirmation", async () => {
    getSellerServiceRequest.mockResolvedValue(sampleRequest);
    acceptServiceRequest.mockResolvedValue({
      ...sampleRequest,
      status: "ACCEPTED",
    });
    render(<SellerServiceRequestDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^accepter$/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: /^accepter$/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirmer/i }));
    await waitFor(() => {
      expect(acceptServiceRequest).toHaveBeenCalledWith("req-1");
    });
  });

  it("complete action for ACCEPTED", async () => {
    getSellerServiceRequest.mockResolvedValue({
      ...sampleRequest,
      status: "ACCEPTED",
    });
    completeServiceRequest.mockResolvedValue({
      ...sampleRequest,
      status: "COMPLETED",
    });
    render(<SellerServiceRequestDetailPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /marquer comme terminé/i })
      ).toBeTruthy();
    });
    fireEvent.click(
      screen.getByRole("button", { name: /marquer comme terminé/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /confirmer/i }));
    await waitFor(() => {
      expect(completeServiceRequest).toHaveBeenCalledWith("req-1");
    });
  });
});
