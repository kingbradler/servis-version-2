"""Status transition rules for ProfessionalProfile."""

from rest_framework.exceptions import ValidationError

from apps.professionals.models import ProfessionalStatus

SELLER_TRANSITIONS = {
    ProfessionalStatus.DRAFT: {ProfessionalStatus.PENDING},
}

ADMIN_TRANSITIONS = {
    ProfessionalStatus.DRAFT: {ProfessionalStatus.PENDING},
    ProfessionalStatus.PENDING: {
        ProfessionalStatus.ACTIVE,
        ProfessionalStatus.SUSPENDED,
    },
    ProfessionalStatus.ACTIVE: {ProfessionalStatus.SUSPENDED},
    ProfessionalStatus.SUSPENDED: {ProfessionalStatus.ACTIVE},
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
