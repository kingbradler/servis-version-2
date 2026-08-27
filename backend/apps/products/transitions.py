"""Product status transition rules."""

from rest_framework.exceptions import ValidationError

from apps.products.models import ProductStatus
from apps.stores.models import StoreStatus

SELLER_TRANSITIONS = {
    ProductStatus.DRAFT: {ProductStatus.ACTIVE, ProductStatus.ARCHIVED, ProductStatus.OUT_OF_STOCK},
    ProductStatus.ACTIVE: {ProductStatus.OUT_OF_STOCK, ProductStatus.ARCHIVED},
    ProductStatus.OUT_OF_STOCK: {ProductStatus.ACTIVE, ProductStatus.ARCHIVED},
    ProductStatus.ARCHIVED: set(),  # soft-delete terminal for seller
}

ADMIN_TRANSITIONS = {
    ProductStatus.DRAFT: {
        ProductStatus.ACTIVE,
        ProductStatus.OUT_OF_STOCK,
        ProductStatus.ARCHIVED,
    },
    ProductStatus.ACTIVE: {
        ProductStatus.OUT_OF_STOCK,
        ProductStatus.ARCHIVED,
        ProductStatus.DRAFT,
    },
    ProductStatus.OUT_OF_STOCK: {
        ProductStatus.ACTIVE,
        ProductStatus.ARCHIVED,
        ProductStatus.DRAFT,
    },
    ProductStatus.ARCHIVED: {
        ProductStatus.DRAFT,
        ProductStatus.ACTIVE,
        ProductStatus.OUT_OF_STOCK,
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
                    f"pour {'vendeur' if actor == 'seller' else 'admin'}."
                )
            }
        )


def assert_can_publish(store_status: str) -> None:
    """Seller may only publish when the store itself is ACTIVE."""
    if store_status != StoreStatus.ACTIVE:
        raise ValidationError(
            {
                "status": (
                    "Impossible de publier un produit tant que la boutique "
                    f"n'est pas ACTIVE (statut actuel: {store_status})."
                )
            }
        )
