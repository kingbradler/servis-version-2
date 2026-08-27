"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import * as ordersService from "@/features/orders/services/orders.service";
import type { Order } from "@/features/orders/types/order.types";
import { PaymentStatusBadge } from "@/features/payments/components/PaymentInstructions";
import * as paymentsService from "@/features/payments/services/payments.service";
import type { Payment } from "@/features/payments/types/payment.types";
import { isApiError } from "@/lib/api/errors";
import { formatPrice } from "@/lib/utils";

interface OrderPaymentRow {
  order: Order;
  payment: Payment;
}

const STATUS_PRIORITY: Record<Payment["status"], number> = {
  PROOF_SUBMITTED: 0,
  PENDING: 1,
  REJECTED: 2,
  CONFIRMED: 3,
  CANCELLED: 4,
};

export default function SellerPaymentsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<OrderPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ordersPage = await ordersService.getSellerOrders();
      const withPayments = await Promise.all(
        ordersPage.results.map(async (order) => {
          const payment = await paymentsService
            .getSellerOrderPayment(order.id)
            .catch(() => null);
          return payment ? { order, payment } : null;
        })
      );
      const filtered = withPayments.filter(
        (r): r is OrderPaymentRow => r !== null
      );
      filtered.sort(
        (a, b) =>
          STATUS_PRIORITY[a.payment.status] - STATUS_PRIORITY[b.payment.status]
      );
      setRows(filtered);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ordersPage = await ordersService.getSellerOrders();
        const withPayments = await Promise.all(
          ordersPage.results.map(async (order) => {
            const payment = await paymentsService
              .getSellerOrderPayment(order.id)
              .catch(() => null);
            return payment ? { order, payment } : null;
          })
        );
        if (cancelled) return;
        const filtered = withPayments.filter(
          (r): r is OrderPaymentRow => r !== null
        );
        filtered.sort(
          (a, b) =>
            STATUS_PRIORITY[a.payment.status] - STATUS_PRIORITY[b.payment.status]
        );
        setRows(filtered);
      } catch (err) {
        if (!cancelled) {
          setError(isApiError(err) ? err.message : "Erreur de chargement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirm = async (orderId: string) => {
    setBusyId(orderId);
    try {
      const updated = await paymentsService.confirmSellerOrderPayment(orderId);
      setRows((prev) =>
        prev.map((r) => (r.order.id === orderId ? { ...r, payment: updated } : r))
      );
      toast({ title: "Paiement confirmé", variant: "success" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec de la confirmation",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      const updated = await paymentsService.rejectSellerOrderPayment(
        rejectTarget.id,
        rejectReason.trim()
      );
      setRows((prev) =>
        prev.map((r) =>
          r.order.id === rejectTarget.id ? { ...r, payment: updated } : r
        )
      );
      toast({ title: "Preuve rejetée", variant: "success" });
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      toast({
        title: "Erreur",
        description: isApiError(err) ? err.message : "Échec du rejet",
        variant: "error",
      });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-heading-l font-bold tracking-tight">Paiements</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Les preuves envoyées par les clients apparaissent en priorité.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={CreditCard}
          title="Aucun paiement pour le moment"
          description="Les paiements liés à vos commandes apparaîtront ici."
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map(({ order, payment }) => (
            <Card key={order.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link
                    href={`/seller/orders/${order.id}`}
                    className="font-medium text-text-primary hover:text-primary"
                  >
                    Commande #{order.id.slice(0, 8)}
                  </Link>
                  <p className="text-caption text-text-muted">
                    {formatPrice(Number(payment.amount))} ·{" "}
                    {payment.payment_method?.label}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <PaymentStatusBadge status={payment.status} />
                  {payment.status === "PROOF_SUBMITTED" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={busyId === order.id}
                        onClick={() => void handleConfirm(order.id)}
                      >
                        Confirmer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectTarget(order)}
                      >
                        Rejeter
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={rejectTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Rejeter la preuve de paiement</ModalTitle>
          </ModalHeader>
          <div className="space-y-4">
            <Input
              label="Motif du rejet"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex : preuve illisible, montant incorrect…"
            />
            <div className="flex gap-3">
              <Button
                variant="danger"
                loading={rejecting}
                disabled={!rejectReason.trim()}
                onClick={() => void handleReject()}
              >
                Confirmer le rejet
              </Button>
              <Button variant="ghost" onClick={() => setRejectTarget(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
