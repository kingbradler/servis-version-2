"""Create in-app notifications (+ optional email, best-effort)."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

from apps.notifications.models import Notification, NotificationType

logger = logging.getLogger(__name__)


def notify(
    *,
    user,
    type: str,
    title: str,
    body: str = "",
    link: str = "",
    email: bool = False,
) -> Notification | None:
    """
    Persist an in-app notification. Optionally email the user (never raises).
    """
    if user is None:
        return None
    try:
        notif = Notification.objects.create(
            user=user,
            type=type if type in NotificationType.values else NotificationType.SYSTEM,
            title=(title or "")[:160],
            body=(body or "")[:500],
            link=(link or "")[:300],
        )
    except Exception:
        logger.exception("Failed to create notification for user=%s", getattr(user, "id", None))
        return None

    if email and getattr(user, "email", None):
        try:
            frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
            full_link = f"{frontend}{link}" if link.startswith("/") else (link or frontend)
            send_mail(
                subject=f"SERVIS — {title}",
                message=(
                    f"{body}\n\n"
                    + (f"Ouvrir : {full_link}\n\n" if link else "")
                    + "— L'équipe SERVIS\n"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            logger.exception("Failed to email notification to %s", user.email)

    return notif


def notify_order_created(order) -> None:
    owner = getattr(getattr(order, "store", None), "owner", None)
    short = str(order.id)[:8]
    notify(
        user=owner,
        type=NotificationType.ORDER_NEW,
        title="Nouvelle commande",
        body=f"Commande #{short} — {order.total_amount} MAD ({order.store_name_snapshot}).",
        link="/seller/orders",
        email=True,
    )


def notify_payment_proof(payment) -> None:
    if payment.service_request_id:
        sr = payment.service_request
        owner = getattr(getattr(sr, "professional", None), "owner", None)
        short = str(sr.id)[:8]
        notify(
            user=owner,
            type=NotificationType.PAYMENT_PROOF,
            title="Preuve de paiement reçue",
            body=f"Le client a envoyé une preuve pour la demande #{short}.",
            link=f"/seller/service-requests/{sr.id}",
            email=True,
        )
        return

    order = payment.order
    owner = getattr(getattr(order, "store", None), "owner", None)
    short = str(order.id)[:8]
    notify(
        user=owner,
        type=NotificationType.PAYMENT_PROOF,
        title="Preuve de paiement reçue",
        body=f"Le client a envoyé une preuve pour la commande #{short}.",
        link=f"/seller/orders/{order.id}",
        email=True,
    )


def notify_payment_confirmed(payment) -> None:
    if payment.service_request_id:
        sr = payment.service_request
        short = str(sr.id)[:8]
        notify(
            user=sr.client,
            type=NotificationType.PAYMENT_CONFIRMED,
            title="Paiement confirmé",
            body=f"Votre paiement pour la demande #{short} a été validé.",
            link=f"/dashboard/service-requests/{sr.id}",
            email=True,
        )
        return

    order = payment.order
    short = str(order.id)[:8]
    notify(
        user=order.user,
        type=NotificationType.PAYMENT_CONFIRMED,
        title="Paiement confirmé",
        body=f"Votre paiement pour la commande #{short} a été validé.",
        link=f"/dashboard/orders/{order.id}",
        email=True,
    )


def notify_payment_rejected(payment) -> None:
    if payment.service_request_id:
        sr = payment.service_request
        short = str(sr.id)[:8]
        reason = (payment.seller_rejection_reason or "").strip()
        body = f"La preuve pour la demande #{short} a été refusée."
        if reason:
            body = f"{body} Motif : {reason}"
        notify(
            user=sr.client,
            type=NotificationType.PAYMENT_REJECTED,
            title="Paiement refusé",
            body=body,
            link=f"/dashboard/service-requests/{sr.id}",
            email=True,
        )
        return

    order = payment.order
    short = str(order.id)[:8]
    reason = (payment.seller_rejection_reason or "").strip()
    body = f"La preuve pour la commande #{short} a été refusée."
    if reason:
        body = f"{body} Motif : {reason}"
    notify(
        user=order.user,
        type=NotificationType.PAYMENT_REJECTED,
        title="Paiement refusé",
        body=body,
        link=f"/dashboard/orders/{order.id}",
        email=True,
    )


def notify_new_message(*, conversation, sender, message_preview: str) -> None:
    """Notify the other participant in a 1:1 conversation."""
    recipient = None
    link = ""
    if conversation.client_id == sender.id:
        recipient = getattr(conversation.professional, "owner", None)
        link = f"/seller/messages/{conversation.id}"
    else:
        recipient = conversation.client
        link = f"/dashboard/messages/{conversation.id}"

    preview = (message_preview or "").strip()
    if len(preview) > 120:
        preview = preview[:117] + "…"

    notify(
        user=recipient,
        type=NotificationType.MESSAGE_NEW,
        title="Nouveau message",
        body=preview or "Vous avez reçu un message sur SERVIS.",
        link=link,
        email=False,
    )


def notify_subscription_expiring(*, subscription, days: int) -> None:
    plan_name = getattr(subscription.plan, "name", "votre offre")
    day_label = "jour" if days == 1 else "jours"
    notify(
        user=subscription.owner,
        type=NotificationType.SUB_EXPIRING,
        title=f"Abonnement expire dans {days} {day_label}",
        body=(
            f'Votre offre « {plan_name} » expire bientôt. '
            "Renouvelez depuis Abonnement pour garder vos avantages."
        ),
        link=f"/seller/subscription?sub={subscription.id}&remind={days}",
        email=True,
    )


def notify_subscription_expired(*, subscription) -> None:
    plan_name = getattr(subscription.plan, "name", "votre offre")
    notify(
        user=subscription.owner,
        type=NotificationType.SUB_EXPIRED,
        title="Abonnement expiré",
        body=(
            f'Votre offre « {plan_name} » a expiré. '
            "Souscrivez à nouveau pour retrouver vos avantages."
        ),
        link=f"/seller/subscription?sub={subscription.id}&expired=1",
        email=True,
    )


def notify_dispute_opened(dispute) -> None:
    from apps.disputes.services import get_dispute_counterparty

    try:
        seller = get_dispute_counterparty(dispute)
    except Exception:
        return
    short = str(dispute.id)[:8]
    notify(
        user=seller,
        type=NotificationType.DISPUTE_OPENED,
        title="Nouveau litige",
        body=f"Un client a ouvert le litige #{short}. Merci de répondre.",
        link="/seller/disputes",
        email=True,
    )


def notify_dispute_reply(dispute) -> None:
    short = str(dispute.id)[:8]
    notify(
        user=dispute.opened_by,
        type=NotificationType.DISPUTE_REPLY,
        title="Réponse à votre litige",
        body=f"Le professionnel a répondu au litige #{short}.",
        link="/dashboard/disputes",
        email=True,
    )


def notify_dispute_resolved(dispute) -> None:
    short = str(dispute.id)[:8]
    label = {
        "RESOLVED": "résolu",
        "REJECTED": "rejeté",
        "CLOSED": "fermé",
    }.get(dispute.status, "traité")
    notify(
        user=dispute.opened_by,
        type=NotificationType.DISPUTE_RESOLVED,
        title=f"Litige {label}",
        body=f"Votre litige #{short} a été {label} par SERVIS.",
        link="/dashboard/disputes",
        email=True,
    )
    from apps.disputes.services import get_dispute_counterparty

    try:
        seller = get_dispute_counterparty(dispute)
    except Exception:
        return
    if seller.id != dispute.opened_by_id:
        notify(
            user=seller,
            type=NotificationType.DISPUTE_RESOLVED,
            title=f"Litige {label}",
            body=f"Le litige #{short} a été {label} par SERVIS.",
            link="/seller/disputes",
            email=True,
        )
