"""Store status transition rules."""

from rest_framework.exceptions import ValidationError

from apps.stores.models import StoreStatus

# Allowed transitions: from_status -> set of to_statuses
SELLER_TRANSITIONS = {
    StoreStatus.DRAFT: {StoreStatus.PENDING},
}

ADMIN_TRANSITIONS = {
    StoreStatus.DRAFT: {StoreStatus.PENDING},
    StoreStatus.PENDING: {StoreStatus.ACTIVE, StoreStatus.SUSPENDED},
    StoreStatus.ACTIVE: {StoreStatus.SUSPENDED},
    StoreStatus.SUSPENDED: {StoreStatus.ACTIVE},
}


def assert_transition(current: str, target: str, *, actor: str) -> None:
    """Raise ValidationError if transition is not allowed for actor ('seller'|'admin')."""
    table = SELLER_TRANSITIONS if actor == "seller" else ADMIN_TRANSITIONS
    allowed = table.get(current, set())
    if target not in allowed:
        raise ValidationError(
            {
                "status": (
                    f"Transition {current} → {target} non autorisée "
                    f"pour {'vendeur' if actor == 'seller' else 'admin'}."
                )
            }
        )
