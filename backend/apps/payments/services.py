"""Payment services — seller methods, client payment, seller confirm/reject."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.core.storage import build_payment_proof_path, get_storage_backend
from apps.orders.models import Order, OrderStatus
from apps.payments.models import (
    Payment,
    PaymentMethod,
    PaymentProof,
    PaymentProofStatus,
    PaymentStatus,
)
from apps.payments.validators import sanitize_text, validate_proof_file
from apps.stores.models import Store, StoreStatus


def get_seller_store(user) -> Store:
    try:
        return Store.objects.get(owner=user)
    except Store.DoesNotExist as exc:
        raise ValidationError(
            {"detail": "Vous devez créer une boutique avant de gérer les paiements."}
        ) from exc


def get_client_order(user, order_id) -> Order:
    try:
        return Order.objects.select_related("store").get(pk=order_id, user=user)
    except Order.DoesNotExist as exc:
        raise NotFound("Commande introuvable.") from exc


def get_seller_order(user, order_id) -> Order:
    try:
        return Order.objects.select_related("store", "user").get(
            pk=order_id, store__owner=user
        )
    except Order.DoesNotExist as exc:
        raise NotFound("Commande introuvable.") from exc


@transaction.atomic
def create_payment(*, user, order_id, payment_method_id) -> Payment:
    order = get_client_order(user, order_id)

    if order.status != OrderStatus.PENDING:
        raise ValidationError(
            {
                "order_id": (
                    "Un paiement ne peut être créé que pour une commande PENDING "
                    f"(actuel: {order.status})."
                )
            }
        )

    if Payment.objects.filter(order=order).exists():
        raise ValidationError(
            {"order_id": "Un paiement existe déjà pour cette commande."}
        )

    if order.store.status != StoreStatus.ACTIVE:
        raise ValidationError({"order_id": "La boutique de cette commande n'est pas active."})

    try:
        method = PaymentMethod.objects.get(
            pk=payment_method_id,
            store=order.store,
            is_active=True,
        )
    except PaymentMethod.DoesNotExist as exc:
        raise ValidationError(
            {
                "payment_method_id": (
                    "Moyen de paiement introuvable, inactif, "
                    "ou n'appartenant pas à cette boutique."
                )
            }
        ) from exc

    return Payment.objects.create(
        order=order,
        payment_method=method,
        amount=order.total_amount,
        currency="MAD",
        status=PaymentStatus.PENDING,
    )


@transaction.atomic
def submit_proof(*, user, order_id, uploaded_file) -> Payment:
    order = get_client_order(user, order_id)
    try:
        payment = Payment.objects.select_for_update().select_related(
            "payment_method", "order"
        ).get(order=order)
    except Payment.DoesNotExist as exc:
        raise NotFound("Aucun paiement pour cette commande.") from exc

    if payment.status == PaymentStatus.CONFIRMED:
        raise ValidationError(
            {"detail": "Ce paiement est déjà confirmé."}
        )
    if payment.status == PaymentStatus.CANCELLED:
        raise ValidationError({"detail": "Ce paiement est annulé."})
    if payment.status not in (PaymentStatus.PENDING, PaymentStatus.REJECTED):
        raise ValidationError(
            {
                "detail": (
                    "Impossible d'envoyer une preuve dans l'état actuel "
                    f"({payment.status})."
                )
            }
        )

    uploaded = validate_proof_file(uploaded_file)
    storage = get_storage_backend()
    path = build_payment_proof_path(
        order.id, getattr(uploaded, "name", "proof.jpg")
    )
    content_type = uploaded.content_type or "application/octet-stream"
    try:
        stored = storage.upload(path, uploaded, content_type, private=True)
    except Exception as exc:
        from apps.core.storage import StorageError

        if isinstance(exc, StorageError):
            raise ValidationError({"proof": str(exc)}) from exc
        raise ValidationError(
            {"proof": "Impossible d'enregistrer la preuve. Réessayez."}
        ) from exc

    # Supersede previous submitted proofs
    payment.proofs.filter(status=PaymentProofStatus.SUBMITTED).update(
        status=PaymentProofStatus.SUPERSEDED
    )

    PaymentProof.objects.create(
        payment=payment,
        file_url=stored,  # object key (private) — signed on read
        uploaded_by=user,
        status=PaymentProofStatus.SUBMITTED,
    )

    payment.proof = stored
    payment.proof_uploaded_at = timezone.now()
    payment.status = PaymentStatus.PROOF_SUBMITTED
    payment.seller_rejection_reason = ""
    payment.save(
        update_fields=[
            "proof",
            "proof_uploaded_at",
            "status",
            "seller_rejection_reason",
            "updated_at",
        ]
    )
    from apps.notifications.services import notify_payment_proof

    notify_payment_proof(payment)
    return payment


@transaction.atomic
def confirm_payment(*, seller, order_id) -> Payment:
    order = get_seller_order(seller, order_id)
    try:
        payment = Payment.objects.select_for_update().select_related(
            "payment_method", "order"
        ).get(order=order)
    except Payment.DoesNotExist as exc:
        raise NotFound("Aucun paiement pour cette commande.") from exc

    if payment.status != PaymentStatus.PROOF_SUBMITTED:
        raise ValidationError(
            {
                "status": (
                    "Seuls les paiements PROOF_SUBMITTED peuvent être confirmés "
                    f"(actuel: {payment.status})."
                )
            }
        )
    if not payment.proof:
        raise ValidationError({"proof": "Aucune preuve à confirmer."})

    now = timezone.now()
    payment.status = PaymentStatus.CONFIRMED
    payment.seller_reviewed_at = now
    payment.seller_rejection_reason = ""
    payment.save(
        update_fields=[
            "status",
            "seller_reviewed_at",
            "seller_rejection_reason",
            "updated_at",
        ]
    )
    payment.proofs.filter(status=PaymentProofStatus.SUBMITTED).update(
        status=PaymentProofStatus.ACCEPTED
    )

    # Mark order as confirmed once paid (existing order status — no PAID inventé)
    if order.status == OrderStatus.PENDING:
        order.status = OrderStatus.CONFIRMED
        order.save(update_fields=["status", "updated_at"])

    from apps.notifications.services import notify_payment_confirmed

    notify_payment_confirmed(payment)
    return payment


@transaction.atomic
def reject_payment(*, seller, order_id, reason: str) -> Payment:
    reason = sanitize_text(reason)
    if not reason:
        raise ValidationError({"reason": "Une raison de rejet est obligatoire."})

    order = get_seller_order(seller, order_id)
    try:
        payment = Payment.objects.select_for_update().get(order=order)
    except Payment.DoesNotExist as exc:
        raise NotFound("Aucun paiement pour cette commande.") from exc

    if payment.status != PaymentStatus.PROOF_SUBMITTED:
        raise ValidationError(
            {
                "status": (
                    "Seuls les paiements PROOF_SUBMITTED peuvent être rejetés "
                    f"(actuel: {payment.status})."
                )
            }
        )

    now = timezone.now()
    payment.status = PaymentStatus.REJECTED
    payment.seller_reviewed_at = now
    payment.seller_rejection_reason = reason
    payment.save(
        update_fields=[
            "status",
            "seller_reviewed_at",
            "seller_rejection_reason",
            "updated_at",
        ]
    )
    payment.proofs.filter(status=PaymentProofStatus.SUBMITTED).update(
        status=PaymentProofStatus.REJECTED,
        rejection_reason=reason,
    )
    from apps.notifications.services import notify_payment_rejected

    notify_payment_rejected(payment)
    return payment


# ── Service request payments ─────────────────────────────────────────


def get_client_service_request(user, request_id):
    from apps.services.models import ServiceRequest

    try:
        return ServiceRequest.objects.select_related(
            "service", "professional", "professional__owner"
        ).get(pk=request_id, client=user)
    except ServiceRequest.DoesNotExist as exc:
        raise NotFound("Demande de service introuvable.") from exc


def get_seller_service_request(user, request_id):
    from apps.services.models import ServiceRequest

    try:
        return ServiceRequest.objects.select_related(
            "service", "professional", "client"
        ).get(pk=request_id, professional__owner=user)
    except ServiceRequest.DoesNotExist as exc:
        raise NotFound("Demande de service introuvable.") from exc


def _service_request_payable_amount(sr) -> Decimal:
    from apps.services.models import ServicePriceType

    service = sr.service
    if service.price_type == ServicePriceType.QUOTE or service.price is None:
        raise ValidationError(
            {
                "detail": (
                    "Ce service est sur devis / sans prix fixe. "
                    "Le paiement en ligne n'est pas disponible."
                )
            }
        )
    return service.price


def list_service_request_payment_methods(*, user, request_id):
    sr = get_client_service_request(user, request_id)
    owner = sr.professional.owner
    try:
        store = Store.objects.get(owner=owner)
    except Store.DoesNotExist as exc:
        raise ValidationError(
            {
                "detail": (
                    "Le professionnel n'a pas encore configuré de boutique "
                    "ni de moyens de paiement."
                )
            }
        ) from exc
    return PaymentMethod.objects.filter(store=store, is_active=True).order_by("label")


@transaction.atomic
def create_service_request_payment(*, user, request_id, payment_method_id) -> Payment:
    from apps.services.models import ServiceRequestStatus

    sr = get_client_service_request(user, request_id)
    if sr.status != ServiceRequestStatus.ACCEPTED:
        raise ValidationError(
            {
                "detail": (
                    "Le paiement n'est disponible qu'après acceptation "
                    f"(statut actuel: {sr.status})."
                )
            }
        )
    if Payment.objects.filter(service_request=sr).exists():
        raise ValidationError(
            {"detail": "Un paiement existe déjà pour cette demande."}
        )

    amount = _service_request_payable_amount(sr)
    owner = sr.professional.owner
    try:
        store = Store.objects.get(owner=owner, status=StoreStatus.ACTIVE)
    except Store.DoesNotExist as exc:
        raise ValidationError(
            {
                "detail": (
                    "Le professionnel doit avoir une boutique active "
                    "avec des moyens de paiement."
                )
            }
        ) from exc

    try:
        method = PaymentMethod.objects.get(
            pk=payment_method_id, store=store, is_active=True
        )
    except PaymentMethod.DoesNotExist as exc:
        raise ValidationError(
            {
                "payment_method_id": (
                    "Moyen de paiement introuvable, inactif, "
                    "ou n'appartenant pas à ce professionnel."
                )
            }
        ) from exc

    return Payment.objects.create(
        service_request=sr,
        order=None,
        payment_method=method,
        amount=amount,
        currency="MAD",
        status=PaymentStatus.PENDING,
    )


@transaction.atomic
def submit_service_request_proof(*, user, request_id, uploaded_file) -> Payment:
    sr = get_client_service_request(user, request_id)
    try:
        payment = Payment.objects.select_for_update().select_related(
            "payment_method", "service_request"
        ).get(service_request=sr)
    except Payment.DoesNotExist as exc:
        raise NotFound("Aucun paiement pour cette demande.") from exc

    if payment.status == PaymentStatus.CONFIRMED:
        raise ValidationError({"detail": "Ce paiement est déjà confirmé."})
    if payment.status == PaymentStatus.CANCELLED:
        raise ValidationError({"detail": "Ce paiement est annulé."})
    if payment.status not in (PaymentStatus.PENDING, PaymentStatus.REJECTED):
        raise ValidationError(
            {
                "detail": (
                    "Impossible d'envoyer une preuve dans l'état actuel "
                    f"({payment.status})."
                )
            }
        )

    uploaded = validate_proof_file(uploaded_file)
    storage = get_storage_backend()
    path = build_payment_proof_path(
        sr.id, getattr(uploaded, "name", "proof.jpg")
    )
    content_type = uploaded.content_type or "application/octet-stream"
    try:
        stored = storage.upload(path, uploaded, content_type, private=True)
    except Exception as exc:
        from apps.core.storage import StorageError

        if isinstance(exc, StorageError):
            raise ValidationError({"proof": str(exc)}) from exc
        raise ValidationError(
            {"proof": "Impossible d'enregistrer la preuve. Réessayez."}
        ) from exc

    payment.proofs.filter(status=PaymentProofStatus.SUBMITTED).update(
        status=PaymentProofStatus.SUPERSEDED
    )
    PaymentProof.objects.create(
        payment=payment,
        file_url=stored,
        uploaded_by=user,
        status=PaymentProofStatus.SUBMITTED,
    )
    payment.proof = stored
    payment.proof_uploaded_at = timezone.now()
    payment.status = PaymentStatus.PROOF_SUBMITTED
    payment.seller_rejection_reason = ""
    payment.save(
        update_fields=[
            "proof",
            "proof_uploaded_at",
            "status",
            "seller_rejection_reason",
            "updated_at",
        ]
    )
    from apps.notifications.services import notify_payment_proof

    notify_payment_proof(payment)
    return payment


@transaction.atomic
def confirm_service_request_payment(*, seller, request_id) -> Payment:
    sr = get_seller_service_request(seller, request_id)
    try:
        payment = Payment.objects.select_for_update().select_related(
            "payment_method", "service_request"
        ).get(service_request=sr)
    except Payment.DoesNotExist as exc:
        raise NotFound("Aucun paiement pour cette demande.") from exc

    if payment.status != PaymentStatus.PROOF_SUBMITTED:
        raise ValidationError(
            {
                "status": (
                    "Seuls les paiements PROOF_SUBMITTED peuvent être confirmés "
                    f"(actuel: {payment.status})."
                )
            }
        )
    if not payment.proof:
        raise ValidationError({"proof": "Aucune preuve à confirmer."})

    now = timezone.now()
    payment.status = PaymentStatus.CONFIRMED
    payment.seller_reviewed_at = now
    payment.seller_rejection_reason = ""
    payment.save(
        update_fields=[
            "status",
            "seller_reviewed_at",
            "seller_rejection_reason",
            "updated_at",
        ]
    )
    payment.proofs.filter(status=PaymentProofStatus.SUBMITTED).update(
        status=PaymentProofStatus.ACCEPTED
    )
    from apps.notifications.services import notify_payment_confirmed

    notify_payment_confirmed(payment)
    return payment


@transaction.atomic
def reject_service_request_payment(*, seller, request_id, reason: str) -> Payment:
    reason = sanitize_text(reason)
    if not reason:
        raise ValidationError({"reason": "Une raison de rejet est obligatoire."})

    sr = get_seller_service_request(seller, request_id)
    try:
        payment = Payment.objects.select_for_update().get(service_request=sr)
    except Payment.DoesNotExist as exc:
        raise NotFound("Aucun paiement pour cette demande.") from exc

    if payment.status != PaymentStatus.PROOF_SUBMITTED:
        raise ValidationError(
            {
                "status": (
                    "Seuls les paiements PROOF_SUBMITTED peuvent être rejetés "
                    f"(actuel: {payment.status})."
                )
            }
        )

    now = timezone.now()
    payment.status = PaymentStatus.REJECTED
    payment.seller_reviewed_at = now
    payment.seller_rejection_reason = reason
    payment.save(
        update_fields=[
            "status",
            "seller_reviewed_at",
            "seller_rejection_reason",
            "updated_at",
        ]
    )
    payment.proofs.filter(status=PaymentProofStatus.SUBMITTED).update(
        status=PaymentProofStatus.REJECTED,
        rejection_reason=reason,
    )
    from apps.notifications.services import notify_payment_rejected

    notify_payment_rejected(payment)
    return payment
