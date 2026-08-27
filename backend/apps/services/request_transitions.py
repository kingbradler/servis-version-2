"""ServiceRequest status transition rules (Phase 6.6 — no payment)."""

from rest_framework.exceptions import ValidationError

from apps.services.models import ServiceRequestStatus

CLIENT_TRANSITIONS = {
    ServiceRequestStatus.PENDING: {ServiceRequestStatus.CANCELLED},
    ServiceRequestStatus.ACCEPTED: set(),
    ServiceRequestStatus.REJECTED: set(),
    ServiceRequestStatus.CANCELLED: set(),
    ServiceRequestStatus.COMPLETED: set(),
}

PROFESSIONAL_TRANSITIONS = {
    ServiceRequestStatus.PENDING: {
        ServiceRequestStatus.ACCEPTED,
        ServiceRequestStatus.REJECTED,
    },
    ServiceRequestStatus.ACCEPTED: {ServiceRequestStatus.COMPLETED},
    ServiceRequestStatus.REJECTED: set(),
    ServiceRequestStatus.CANCELLED: set(),
    ServiceRequestStatus.COMPLETED: set(),
}


def assert_request_transition(current: str, target: str, *, actor: str) -> None:
    """
    actor: "client" | "professional"

    Admin has no status mutation API in Phase 6.6.
    """
    if actor == "client":
        table = CLIENT_TRANSITIONS
        label = "client"
    elif actor == "professional":
        table = PROFESSIONAL_TRANSITIONS
        label = "professionnel"
    else:
        raise ValidationError({"status": "Acteur de transition inconnu."})

    allowed = table.get(current, set())
    if target not in allowed:
        raise ValidationError(
            {
                "status": (
                    f"Transition {current} → {target} non autorisée "
                    f"pour {label}."
                )
            }
        )
