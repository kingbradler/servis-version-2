"""Business logic for disputes."""

from __future__ import annotations

from django.db import transaction
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.disputes.models import (
    OPEN_STATUSES,
    Dispute,
    DisputeReason,
    DisputeStatus,
)
from apps.orders.models import Order, OrderStatus
from apps.services.models import ServiceRequest, ServiceRequestStatus
from apps.stores.validators import sanitize_text
from apps.users.choices import UserRole

ORDER_DISPUTABLE = {
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
}
SR_DISPUTABLE = {
    ServiceRequestStatus.ACCEPTED,
    ServiceRequestStatus.COMPLETED,
}


def get_dispute_counterparty(dispute: Dispute):
    """Seller / professional owner who must reply."""
    if dispute.order_id:
        return dispute.order.store.owner
    return dispute.service_request.professional.owner


def user_can_view_dispute(user, dispute: Dispute) -> bool:
    if getattr(user, "role", None) == UserRole.ADMIN:
        return True
    if dispute.opened_by_id == user.id:
        return True
    try:
        return get_dispute_counterparty(dispute).id == user.id
    except Exception:
        return False


def _assert_no_open_dispute(*, order=None, service_request=None):
    qs = Dispute.objects.filter(status__in=OPEN_STATUSES)
    if order is not None:
        qs = qs.filter(order=order)
    else:
        qs = qs.filter(service_request=service_request)
    if qs.exists():
        raise ValidationError(
            {"detail": "Un litige est déjà ouvert pour cette transaction."}
        )


@transaction.atomic
def create_dispute(
    *,
    user,
    order_id=None,
    service_request_id=None,
    reason: str,
    description: str,
) -> Dispute:
    if bool(order_id) == bool(service_request_id):
        raise ValidationError(
            {
                "detail": (
                    "Indiquez soit order_id, soit service_request_id "
                    "(exactement un des deux)."
                )
            }
        )
    if reason not in DisputeReason.values:
        raise ValidationError({"reason": "Motif invalide."})
    description = sanitize_text(description or "")
    if len(description) < 10:
        raise ValidationError(
            {"description": "Décrivez le problème (10 caractères minimum)."}
        )

    order = None
    service_request = None
    if order_id:
        try:
            order = Order.objects.select_related("store", "store__owner").get(
                pk=order_id, user=user
            )
        except Order.DoesNotExist as exc:
            raise NotFound("Commande introuvable.") from exc
        if order.status not in ORDER_DISPUTABLE:
            raise ValidationError(
                {
                    "order_id": (
                        "Litige possible uniquement après confirmation "
                        f"(statut actuel: {order.status})."
                    )
                }
            )
        _assert_no_open_dispute(order=order)
    else:
        try:
            service_request = ServiceRequest.objects.select_related(
                "professional", "professional__owner", "service"
            ).get(pk=service_request_id, client=user)
        except ServiceRequest.DoesNotExist as exc:
            raise NotFound("Demande de service introuvable.") from exc
        if service_request.status not in SR_DISPUTABLE:
            raise ValidationError(
                {
                    "service_request_id": (
                        "Litige possible après acceptation ou terminaison "
                        f"(statut actuel: {service_request.status})."
                    )
                }
            )
        _assert_no_open_dispute(service_request=service_request)

    dispute = Dispute.objects.create(
        opened_by=user,
        order=order,
        service_request=service_request,
        reason=reason,
        description=description,
        status=DisputeStatus.OPEN,
    )
    from apps.notifications.services import notify_dispute_opened

    notify_dispute_opened(dispute)
    return dispute


@transaction.atomic
def reply_to_dispute(*, seller, dispute_id, reply: str) -> Dispute:
    try:
        dispute = (
            Dispute.objects.select_for_update()
            .select_related(
                "order",
                "order__store",
                "order__store__owner",
                "service_request",
                "service_request__professional",
                "service_request__professional__owner",
                "opened_by",
            )
            .get(pk=dispute_id)
        )
    except Dispute.DoesNotExist as exc:
        raise NotFound("Litige introuvable.") from exc

    if get_dispute_counterparty(dispute).id != seller.id:
        raise PermissionDenied("Ce litige ne vous concerne pas.")
    if dispute.status not in (DisputeStatus.OPEN, DisputeStatus.SELLER_REPLIED):
        raise ValidationError(
            {"detail": f"Impossible de répondre (statut: {dispute.status})."}
        )
    reply = sanitize_text(reply or "")
    if len(reply) < 5:
        raise ValidationError({"reply": "Réponse trop courte (5 caractères min.)."})

    dispute.seller_reply = reply
    dispute.status = DisputeStatus.SELLER_REPLIED
    dispute.save(update_fields=["seller_reply", "status", "updated_at"])
    from apps.notifications.services import notify_dispute_reply

    notify_dispute_reply(dispute)
    return dispute


@transaction.atomic
def close_dispute_by_client(*, user, dispute_id) -> Dispute:
    try:
        dispute = Dispute.objects.select_for_update().get(
            pk=dispute_id, opened_by=user
        )
    except Dispute.DoesNotExist as exc:
        raise NotFound("Litige introuvable.") from exc
    if dispute.status not in OPEN_STATUSES:
        raise ValidationError({"detail": "Ce litige est déjà clôturé."})
    dispute.status = DisputeStatus.CLOSED
    dispute.save(update_fields=["status", "updated_at"])
    return dispute


@transaction.atomic
def resolve_dispute_admin(
    *,
    dispute_id,
    status: str,
    admin_note: str = "",
) -> Dispute:
    if status not in (
        DisputeStatus.RESOLVED,
        DisputeStatus.REJECTED,
        DisputeStatus.CLOSED,
    ):
        raise ValidationError(
            {"status": "Statut admin autorisé: RESOLVED, REJECTED ou CLOSED."}
        )
    try:
        dispute = (
            Dispute.objects.select_for_update()
            .select_related(
                "order",
                "order__store",
                "order__store__owner",
                "service_request",
                "service_request__professional",
                "service_request__professional__owner",
                "opened_by",
            )
            .get(pk=dispute_id)
        )
    except Dispute.DoesNotExist as exc:
        raise NotFound("Litige introuvable.") from exc

    dispute.status = status
    dispute.admin_note = sanitize_text(admin_note or "")
    dispute.save(update_fields=["status", "admin_note", "updated_at"])
    from apps.notifications.services import notify_dispute_resolved

    notify_dispute_resolved(dispute)
    return dispute


def disputes_for_seller(user):
    from django.db.models import Q

    return (
        Dispute.objects.filter(
            Q(order__store__owner=user)
            | Q(service_request__professional__owner=user)
        )
        .select_related(
            "opened_by",
            "order",
            "order__store",
            "service_request",
            "service_request__service",
            "service_request__professional",
        )
        .order_by("-created_at")
    )
