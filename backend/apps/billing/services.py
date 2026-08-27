"""Central billing entitlements — single source of truth for plan limits."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.billing.models import (
    Boost,
    BoostPackage,
    BoostPayment,
    BoostPaymentStatus,
    BoostStatus,
    BoostTargetType,
    Plan,
    PlanCategory,
    PlanType,
    PlatformPaymentMethod,
    Subscription,
    SubscriptionPayment,
    SubscriptionPaymentStatus,
    SubscriptionStatus,
)
from apps.products.models import Product, ProductStatus
from apps.services.models import Service, ServiceStatus
from apps.stores.models import Store

FREE_PRODUCT_LIMIT = 5
FREE_PRODUCT_IMAGE_LIMIT = 1
# Absolute technical ceiling (highest STORE plan).
MAX_PRODUCT_IMAGE_LIMIT = 5


@dataclass(frozen=True)
class StoreEntitlements:
    plan_code: str
    plan_name: str
    product_limit: int | None  # None = unlimited
    product_image_limit: int
    advanced_stats: bool
    visibility_level: int
    boosts_allowed: bool
    subscription_id: str | None
    status: str
    starts_at: datetime | None
    expires_at: datetime | None
    days_remaining: int | None
    active_product_count: int


@dataclass(frozen=True)
class ServiceEntitlements:
    plan_code: str | None
    plan_name: str | None
    has_active_subscription: bool
    advanced_stats: bool
    visibility_level: int
    boosts_allowed: bool
    subscription_id: str | None
    status: str | None
    starts_at: datetime | None
    expires_at: datetime | None
    days_remaining: int | None


def expire_stale_subscriptions(*, now=None, notify_owners: bool = True) -> int:
    """Mark ACTIVE subscriptions past expires_at as EXPIRED. Returns count."""
    now = now or timezone.now()
    stale = list(
        Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            expires_at__isnull=False,
            expires_at__lte=now,
        ).select_related("owner", "plan")
    )
    if not stale:
        return 0
    ids = [sub.id for sub in stale]
    count = Subscription.objects.filter(pk__in=ids).update(
        status=SubscriptionStatus.EXPIRED,
        updated_at=now,
    )
    for sub in stale:
        if sub.category == PlanCategory.SERVICE:
            Service.objects.filter(
                professional_profile__owner_id=sub.owner_id,
                status=ServiceStatus.ACTIVE,
            ).update(status=ServiceStatus.ARCHIVED, updated_at=now)
        if notify_owners:
            from apps.notifications.services import notify_subscription_expired

            notify_subscription_expired(subscription=sub)
    return count


def remind_expiring_subscriptions(
    *,
    now=None,
    days_before: tuple[int, ...] = (7, 3, 1),
) -> int:
    """
    Send in-app (+ email) reminders for ACTIVE paid subs whose expiry
    calendar day is exactly now+N days. Idempotent per (sub, days) for ~20h.
    """
    from datetime import timedelta

    from apps.notifications.models import Notification, NotificationType
    from apps.notifications.services import notify_subscription_expiring

    now = now or timezone.now()
    sent = 0
    since = now - timedelta(hours=20)

    for days in days_before:
        if days < 1:
            continue
        target = (now + timedelta(days=days)).date()
        qs = (
            Subscription.objects.filter(
                status=SubscriptionStatus.ACTIVE,
                expires_at__isnull=False,
                expires_at__date=target,
            )
            .exclude(plan__price=0)
            .select_related("owner", "plan")
        )
        for sub in qs:
            link_marker = f"sub={sub.id}&remind={days}"
            already = Notification.objects.filter(
                user_id=sub.owner_id,
                type=NotificationType.SUB_EXPIRING,
                link__contains=link_marker,
                created_at__gte=since,
            ).exists()
            if already:
                continue
            notify_subscription_expiring(subscription=sub, days=days)
            sent += 1
    return sent


def run_billing_maintenance(*, now=None, remind: bool = True) -> dict:
    """Expire stale subs/boosts and optionally send expiry reminders."""
    now = now or timezone.now()
    expired_subs = expire_stale_subscriptions(now=now)
    expired_boosts = expire_stale_boosts(now=now)
    reminders = remind_expiring_subscriptions(now=now) if remind else 0
    return {
        "expired_subscriptions": expired_subs,
        "expired_boosts": expired_boosts,
        "reminders_sent": reminders,
    }


def expire_stale_boosts(*, now=None) -> int:
    now = now or timezone.now()
    qs = Boost.objects.filter(
        status=BoostStatus.ACTIVE,
        expires_at__isnull=False,
        expires_at__lte=now,
    )
    return qs.update(status=BoostStatus.EXPIRED, updated_at=now)


def is_subscription_active(subscription: Subscription | None, *, now=None) -> bool:
    if subscription is None:
        return False
    now = now or timezone.now()
    if subscription.status != SubscriptionStatus.ACTIVE:
        return False
    if subscription.expires_at and subscription.expires_at <= now:
        return False
    if subscription.starts_at and subscription.starts_at > now:
        return False
    return True


def is_boost_active(boost: Boost | None, *, now=None) -> bool:
    if boost is None:
        return False
    now = now or timezone.now()
    if boost.status != BoostStatus.ACTIVE:
        return False
    if boost.expires_at and boost.expires_at <= now:
        return False
    if boost.starts_at and boost.starts_at > now:
        return False
    return True


def _days_remaining(expires_at: datetime | None, *, now=None) -> int | None:
    if expires_at is None:
        return None
    now = now or timezone.now()
    delta = expires_at - now
    if delta.total_seconds() <= 0:
        return 0
    return max(0, delta.days)


def get_active_subscription(owner, category: str, *, now=None) -> Subscription | None:
    expire_stale_subscriptions(now=now)
    now = now or timezone.now()
    sub = (
        Subscription.objects.select_related("plan")
        .filter(owner=owner, category=category, status=SubscriptionStatus.ACTIVE)
        .order_by("-activated_at")
        .first()
    )
    if sub and not is_subscription_active(sub, now=now):
        Subscription.objects.filter(pk=sub.pk).update(
            status=SubscriptionStatus.EXPIRED,
            updated_at=now,
        )
        return None
    return sub


def count_active_products(owner) -> int:
    try:
        store = owner.store
    except Store.DoesNotExist:
        return 0
    return Product.objects.filter(
        store=store,
        status__in=[ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK],
    ).count()


def get_store_entitlements(owner, *, now=None) -> StoreEntitlements:
    """Implicit Free when no active STORE subscription."""
    now = now or timezone.now()
    sub = get_active_subscription(owner, PlanCategory.STORE, now=now)
    active_count = count_active_products(owner)

    if sub is None:
        free = Plan.objects.filter(code=PlanType.STORE_FREE, is_active=True).first()
        limit = free.product_limit if free else FREE_PRODUCT_LIMIT
        image_limit = (
            free.product_image_limit if free else FREE_PRODUCT_IMAGE_LIMIT
        )
        return StoreEntitlements(
            plan_code=PlanType.STORE_FREE,
            plan_name=free.name if free else "Free",
            product_limit=limit if limit is not None else FREE_PRODUCT_LIMIT,
            product_image_limit=min(
                int(image_limit or FREE_PRODUCT_IMAGE_LIMIT),
                MAX_PRODUCT_IMAGE_LIMIT,
            ),
            advanced_stats=False,
            visibility_level=0,
            boosts_allowed=False,
            subscription_id=None,
            status=SubscriptionStatus.ACTIVE,
            starts_at=None,
            expires_at=None,
            days_remaining=None,
            active_product_count=active_count,
        )

    plan = sub.plan
    return StoreEntitlements(
        plan_code=plan.code,
        plan_name=plan.name,
        product_limit=plan.product_limit,
        product_image_limit=min(
            int(plan.product_image_limit or FREE_PRODUCT_IMAGE_LIMIT),
            MAX_PRODUCT_IMAGE_LIMIT,
        ),
        advanced_stats=plan.advanced_stats,
        visibility_level=plan.visibility_level,
        boosts_allowed=plan.boosts_allowed,
        subscription_id=str(sub.id),
        status=sub.status,
        starts_at=sub.starts_at,
        expires_at=sub.expires_at,
        days_remaining=_days_remaining(sub.expires_at, now=now),
        active_product_count=active_count,
    )


def get_product_image_limit(owner) -> int:
    """Max images allowed per product for this seller's current store plan."""
    return get_store_entitlements(owner).product_image_limit


def get_service_entitlements(owner, *, now=None) -> ServiceEntitlements:
    now = now or timezone.now()
    sub = get_active_subscription(owner, PlanCategory.SERVICE, now=now)
    if sub is None:
        return ServiceEntitlements(
            plan_code=None,
            plan_name=None,
            has_active_subscription=False,
            advanced_stats=False,
            visibility_level=0,
            boosts_allowed=False,
            subscription_id=None,
            status=None,
            starts_at=None,
            expires_at=None,
            days_remaining=None,
        )
    plan = sub.plan
    return ServiceEntitlements(
        plan_code=plan.code,
        plan_name=plan.name,
        has_active_subscription=True,
        advanced_stats=plan.advanced_stats,
        visibility_level=plan.visibility_level,
        boosts_allowed=plan.boosts_allowed,
        subscription_id=str(sub.id),
        status=sub.status,
        starts_at=sub.starts_at,
        expires_at=sub.expires_at,
        days_remaining=_days_remaining(sub.expires_at, now=now),
    )


def assert_can_add_or_publish_product(owner, *, counting_extra: int = 1) -> None:
    """
    Enforce product limits on create / publish / reactivate.

    Rule (Phase 6.8): existing excess listings may remain after downgrade,
    but the seller cannot increase the active count beyond the current limit.
    """
    entitlements = get_store_entitlements(owner)
    limit = entitlements.product_limit
    if limit is None:
        return
    if entitlements.active_product_count + counting_extra > limit:
        raise ValidationError(
            {
                "detail": (
                    f"Vous avez atteint la limite de produits actifs "
                    f"({entitlements.active_product_count}/{limit}) pour "
                    f"l'offre « {entitlements.plan_name} ». "
                    "Passez à un abonnement supérieur ou archivez des produits "
                    "pour en publier de nouveaux."
                ),
                "error_code": "product_limit_exceeded",
                "limit": limit,
                "active_count": entitlements.active_product_count,
                "plan": entitlements.plan_code,
            }
        )


def assert_product_becoming_listed(owner, product: Product) -> None:
    """Call when transitioning a product into ACTIVE/OUT_OF_STOCK from non-listed."""
    listed = {ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK}
    if product.status in listed:
        return
    assert_can_add_or_publish_product(owner, counting_extra=1)


def assert_can_publish_service(owner) -> None:
    entitlements = get_service_entitlements(owner)
    if not entitlements.has_active_subscription:
        raise ValidationError(
            {
                "detail": (
                    "Pour publier un service, vous devez d'abord activer un "
                    "abonnement Services. Rendez-vous dans Abonnement pour "
                    "choisir une offre et débloquer cette fonctionnalité."
                ),
                "error_code": "service_subscription_required",
            }
        )


def deactivate_services_on_expiry(owner) -> int:
    """
    Soft-deactivate public services when SERVICE subscription is not active.
    Does not delete rows. Returns number of services archived.
    """
    entitlements = get_service_entitlements(owner)
    if entitlements.has_active_subscription:
        return 0
    return Service.objects.filter(
        professional_profile__owner=owner,
        status=ServiceStatus.ACTIVE,
    ).update(status=ServiceStatus.ARCHIVED)


def assert_boosts_allowed(owner) -> None:
    store = get_store_entitlements(owner)
    service = get_service_entitlements(owner)
    if not (store.boosts_allowed or service.boosts_allowed):
        raise PermissionDenied(
            "Les Boosts nécessitent un abonnement Pro (boutique ou services)."
        )


@transaction.atomic
def create_subscription_request(
    *,
    owner,
    plan: Plan,
    payment_method: PlatformPaymentMethod | None = None,
) -> tuple[Subscription, SubscriptionPayment | None]:
    if not plan.is_active:
        raise ValidationError({"plan": "Ce plan n'est pas disponible."})
    if plan.category not in (PlanCategory.STORE, PlanCategory.SERVICE):
        raise ValidationError({"plan": "Catégorie de plan invalide."})

    # Free store: activate immediately, cancel prior active store sub
    if plan.code == PlanType.STORE_FREE or plan.price == 0:
        Subscription.objects.filter(
            owner=owner,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
        ).update(
            status=SubscriptionStatus.CANCELLED,
            cancelled_at=timezone.now(),
        )
        now = timezone.now()
        sub = Subscription.objects.create(
            owner=owner,
            plan=plan,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=now,
            expires_at=None,
            activated_at=now,
        )
        return sub, None

    if payment_method is None or not payment_method.is_active:
        raise ValidationError(
            {"payment_method": "Choisissez un moyen de paiement SERVIS actif."}
        )

    # Cancel other pending requests same category (keep history of payments)
    Subscription.objects.filter(
        owner=owner,
        category=plan.category,
        status=SubscriptionStatus.PENDING,
    ).update(status=SubscriptionStatus.CANCELLED, cancelled_at=timezone.now())

    sub = Subscription.objects.create(
        owner=owner,
        plan=plan,
        category=plan.category,
        status=SubscriptionStatus.PENDING,
    )
    payment = SubscriptionPayment.objects.create(
        subscription=sub,
        owner=owner,
        amount=plan.price,
        payment_method=payment_method,
        status=SubscriptionPaymentStatus.PENDING,
    )
    return sub, payment


@transaction.atomic
def submit_subscription_proof(
    *,
    payment: SubscriptionPayment,
    proof_path: str,
    reference: str = "",
) -> SubscriptionPayment:
    if payment.status not in (
        SubscriptionPaymentStatus.PENDING,
        SubscriptionPaymentStatus.PROOF_SUBMITTED,
        SubscriptionPaymentStatus.REJECTED,
    ):
        raise ValidationError({"detail": "Ce paiement ne peut plus recevoir de preuve."})
    if payment.subscription.status == SubscriptionStatus.ACTIVE:
        raise ValidationError({"detail": "L'abonnement est déjà actif."})
    if not proof_path:
        raise ValidationError({"proof": "Preuve de paiement requise."})

    payment.proof = proof_path
    payment.reference = (reference or "")[:120]
    payment.submitted_at = timezone.now()
    payment.status = SubscriptionPaymentStatus.PROOF_SUBMITTED
    payment.rejection_reason = ""
    payment.save(
        update_fields=[
            "proof",
            "reference",
            "submitted_at",
            "status",
            "rejection_reason",
            "updated_at",
        ]
    )
    if payment.subscription.status == SubscriptionStatus.REJECTED:
        payment.subscription.status = SubscriptionStatus.PENDING
        payment.subscription.save(update_fields=["status", "updated_at"])
    return payment


@transaction.atomic
def approve_subscription_payment(*, payment: SubscriptionPayment, admin) -> Subscription:
    if payment.status == SubscriptionPaymentStatus.APPROVED:
        raise ValidationError({"detail": "Paiement déjà approuvé."})
    if payment.status not in (
        SubscriptionPaymentStatus.PROOF_SUBMITTED,
        SubscriptionPaymentStatus.PENDING,
    ):
        raise ValidationError({"detail": "Statut de paiement non approuvable."})
    if not payment.proof:
        raise ValidationError({"detail": "Aucune preuve de paiement."})

    expected = payment.subscription.plan.price
    if payment.amount != expected:
        raise ValidationError(
            {
                "detail": f"Montant incohérent (attendu {expected} DH).",
                "code": "amount_mismatch",
            }
        )

    sub = payment.subscription
    now = timezone.now()

    # Expire/cancel other active same category
    Subscription.objects.filter(
        owner=sub.owner,
        category=sub.category,
        status=SubscriptionStatus.ACTIVE,
    ).exclude(pk=sub.pk).update(
        status=SubscriptionStatus.CANCELLED,
        cancelled_at=now,
    )

    payment.status = SubscriptionPaymentStatus.APPROVED
    payment.reviewed_at = now
    payment.reviewed_by = admin
    payment.rejection_reason = ""
    payment.save(
        update_fields=[
            "status",
            "reviewed_at",
            "reviewed_by",
            "rejection_reason",
            "updated_at",
        ]
    )

    duration = sub.plan.duration_days or 30
    sub.status = SubscriptionStatus.ACTIVE
    sub.starts_at = now
    sub.activated_at = now
    sub.expires_at = now + timedelta(days=duration)
    sub.cancelled_at = None
    sub.save(
        update_fields=[
            "status",
            "starts_at",
            "activated_at",
            "expires_at",
            "cancelled_at",
            "updated_at",
        ]
    )
    return sub


@transaction.atomic
def reject_subscription_payment(
    *,
    payment: SubscriptionPayment,
    admin,
    reason: str,
) -> SubscriptionPayment:
    if payment.status == SubscriptionPaymentStatus.APPROVED:
        raise ValidationError({"detail": "Paiement déjà approuvé."})
    if not reason or not reason.strip():
        raise ValidationError({"rejection_reason": "Motif de refus requis."})

    now = timezone.now()
    payment.status = SubscriptionPaymentStatus.REJECTED
    payment.reviewed_at = now
    payment.reviewed_by = admin
    payment.rejection_reason = reason.strip()
    payment.save(
        update_fields=[
            "status",
            "reviewed_at",
            "reviewed_by",
            "rejection_reason",
            "updated_at",
        ]
    )
    sub = payment.subscription
    if sub.status != SubscriptionStatus.ACTIVE:
        sub.status = SubscriptionStatus.REJECTED
        sub.save(update_fields=["status", "updated_at"])
    return payment


def active_boost_q(target_type: str, *, now=None):
    now = now or timezone.now()
    expire_stale_boosts(now=now)
    return Q(
        status=BoostStatus.ACTIVE,
        target_type=target_type,
    ) & (Q(starts_at__isnull=True) | Q(starts_at__lte=now)) & (
        Q(expires_at__isnull=True) | Q(expires_at__gt=now)
    )


def has_active_boost(*, target_type: str, target_id, now=None) -> bool:
    now = now or timezone.now()
    return Boost.objects.filter(
        active_boost_q(target_type, now=now),
        target_id=target_id,
    ).exists()


def visibility_sort_key_for_owner(owner) -> tuple[int, int]:
    """
    Ranking helpers: (boost_flag, plan_visibility).
    Boost and plan must remain distinguishable from reputation in the UI.
    """
    store = get_store_entitlements(owner)
    service = get_service_entitlements(owner)
    boosted = 0
    try:
        if has_active_boost(target_type=BoostTargetType.STORE, target_id=owner.store.id):
            boosted = 1
    except Store.DoesNotExist:
        pass
    vis = max(store.visibility_level, service.visibility_level)
    return boosted, vis


@transaction.atomic
def create_boost_request(
    *,
    owner,
    package: BoostPackage,
    target_type: str,
    target_id,
    payment_method: PlatformPaymentMethod,
) -> tuple[Boost, BoostPayment]:
    assert_boosts_allowed(owner)
    if not package.is_active:
        raise ValidationError({"package": "Forfait boost indisponible."})
    if not payment_method.is_active:
        raise ValidationError({"payment_method": "Moyen de paiement invalide."})
    if target_type not in BoostTargetType.values:
        raise ValidationError({"target_type": "Type de cible invalide."})

    _assert_boost_target_owned(owner, target_type, target_id)

    payment = BoostPayment.objects.create(
        owner=owner,
        amount=package.price,
        payment_method=payment_method,
        status=BoostPaymentStatus.PENDING,
    )
    boost = Boost.objects.create(
        owner=owner,
        package=package,
        target_type=target_type,
        target_id=target_id,
        duration_days=package.duration_days,
        amount=package.price,
        status=BoostStatus.PENDING,
        payment=payment,
    )
    return boost, payment


def _assert_boost_target_owned(owner, target_type: str, target_id) -> None:
    if target_type == BoostTargetType.STORE:
        try:
            store = owner.store
        except Store.DoesNotExist as exc:
            raise ValidationError({"target_id": "Boutique introuvable."}) from exc
        if store.id != target_id:
            raise PermissionDenied("Cette boutique ne vous appartient pas.")
    elif target_type == BoostTargetType.PRODUCT:
        if not Product.objects.filter(id=target_id, store__owner=owner).exists():
            raise PermissionDenied("Ce produit ne vous appartient pas.")
    elif target_type == BoostTargetType.SERVICE:
        if not Service.objects.filter(
            id=target_id, professional_profile__owner=owner
        ).exists():
            raise PermissionDenied("Ce service ne vous appartient pas.")


@transaction.atomic
def submit_boost_proof(
    *,
    payment: BoostPayment,
    proof_path: str,
    reference: str = "",
) -> BoostPayment:
    if payment.status not in (
        BoostPaymentStatus.PENDING,
        BoostPaymentStatus.PROOF_SUBMITTED,
        BoostPaymentStatus.REJECTED,
    ):
        raise ValidationError({"detail": "Ce paiement ne peut plus recevoir de preuve."})
    if not proof_path:
        raise ValidationError({"proof": "Preuve requise."})
    payment.proof = proof_path
    payment.reference = (reference or "")[:120]
    payment.submitted_at = timezone.now()
    payment.status = BoostPaymentStatus.PROOF_SUBMITTED
    payment.rejection_reason = ""
    payment.save(
        update_fields=[
            "proof",
            "reference",
            "submitted_at",
            "status",
            "rejection_reason",
            "updated_at",
        ]
    )
    return payment


@transaction.atomic
def approve_boost_payment(*, payment: BoostPayment, admin) -> Boost:
    if payment.status == BoostPaymentStatus.APPROVED:
        raise ValidationError({"detail": "Paiement déjà approuvé."})
    if not payment.proof:
        raise ValidationError({"detail": "Aucune preuve."})
    try:
        boost = payment.boost
    except Boost.DoesNotExist as exc:
        raise ValidationError({"detail": "Boost introuvable."}) from exc

    if payment.amount != boost.amount:
        raise ValidationError({"detail": "Montant incohérent."})

    now = timezone.now()
    payment.status = BoostPaymentStatus.APPROVED
    payment.reviewed_at = now
    payment.reviewed_by = admin
    payment.rejection_reason = ""
    payment.save(
        update_fields=[
            "status",
            "reviewed_at",
            "reviewed_by",
            "rejection_reason",
            "updated_at",
        ]
    )

    boost.status = BoostStatus.ACTIVE
    boost.starts_at = now
    boost.expires_at = now + timedelta(days=boost.duration_days)
    boost.save(update_fields=["status", "starts_at", "expires_at", "updated_at"])
    return boost


@transaction.atomic
def reject_boost_payment(*, payment: BoostPayment, admin, reason: str) -> BoostPayment:
    if payment.status == BoostPaymentStatus.APPROVED:
        raise ValidationError({"detail": "Paiement déjà approuvé."})
    if not reason or not reason.strip():
        raise ValidationError({"rejection_reason": "Motif requis."})
    now = timezone.now()
    payment.status = BoostPaymentStatus.REJECTED
    payment.reviewed_at = now
    payment.reviewed_by = admin
    payment.rejection_reason = reason.strip()
    payment.save(
        update_fields=[
            "status",
            "reviewed_at",
            "reviewed_by",
            "rejection_reason",
            "updated_at",
        ]
    )
    try:
        boost = payment.boost
        if boost.status != BoostStatus.ACTIVE:
            boost.status = BoostStatus.REJECTED
            boost.save(update_fields=["status", "updated_at"])
    except Boost.DoesNotExist:
        pass
    return payment


def plan_price_locked(plan: Plan) -> Decimal:
    """Backend is source of truth for amounts."""
    return plan.price
