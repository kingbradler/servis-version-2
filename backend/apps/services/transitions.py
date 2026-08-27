"""Service status transition rules."""

from rest_framework.exceptions import ValidationError

from apps.professionals.models import ProfessionalStatus
from apps.services.models import ServiceStatus

SELLER_TRANSITIONS = {
    ServiceStatus.DRAFT: {ServiceStatus.ACTIVE, ServiceStatus.ARCHIVED},
    ServiceStatus.ACTIVE: {ServiceStatus.ARCHIVED},
    # Republish after subscription renew (Phase 6.8) — still gated by billing entitlements
    ServiceStatus.ARCHIVED: {ServiceStatus.DRAFT, ServiceStatus.ACTIVE},
}

ADMIN_TRANSITIONS = {
    ServiceStatus.DRAFT: {ServiceStatus.ACTIVE, ServiceStatus.ARCHIVED},
    ServiceStatus.ACTIVE: {ServiceStatus.ARCHIVED, ServiceStatus.DRAFT},
    ServiceStatus.ARCHIVED: {
        ServiceStatus.DRAFT,
        ServiceStatus.ACTIVE,
    },
}


def assert_transition(current: str, target: str, *, actor: str) -> None:
    table = SELLER_TRANSITIONS if actor == "seller" else ADMIN_TRANSITIONS
    allowed = table.get(current, set())
    if target not in allowed:
        raise ValidationError(
            {
                "status": (
                    f"Transition {current} → {target} non autorisée "
                    f"pour {'professionnel' if actor == 'seller' else 'admin'}."
                )
            }
        )


def assert_can_publish(profile_status: str) -> None:
    """Seller may only publish when the professional profile itself is ACTIVE."""
    if profile_status != ProfessionalStatus.ACTIVE:
        raise ValidationError(
            {
                "status": (
                    "Impossible de publier un service tant que votre profil "
                    "professionnel n'est pas encore validé et actif. "
                    "Complétez votre profil et attendez la validation si besoin."
                )
            }
        )
