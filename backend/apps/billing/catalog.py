"""Canonical billing catalog — used by seed command and data migrations."""

from decimal import Decimal

PLANS = [
    {
        "code": "STORE_FREE",
        "name": "Boutique Free",
        "plan_type": "STORE_FREE",
        "category": "STORE",
        "price": Decimal("0.00"),
        "duration_days": 30,
        "product_limit": 5,
        "product_image_limit": 1,
        "service_enabled": False,
        "advanced_stats": False,
        "visibility_level": 0,
        "boosts_allowed": False,
        "sort_order": 10,
    },
    {
        "code": "STORE_STANDARD",
        "name": "Boutique Standard",
        "plan_type": "STORE_STANDARD",
        "category": "STORE",
        "price": Decimal("49.00"),
        "duration_days": 30,
        "product_limit": 20,
        "product_image_limit": 3,
        "service_enabled": False,
        "advanced_stats": False,
        "visibility_level": 1,
        "boosts_allowed": False,
        "sort_order": 20,
    },
    {
        "code": "STORE_PRO",
        "name": "Boutique Premium",
        "plan_type": "STORE_PRO",
        "category": "STORE",
        "price": Decimal("99.00"),
        "duration_days": 30,
        "product_limit": None,
        "product_image_limit": 5,
        "service_enabled": False,
        "advanced_stats": True,
        "visibility_level": 2,
        "boosts_allowed": True,
        "sort_order": 30,
    },
    {
        "code": "SERVICE_STANDARD",
        "name": "Services Standard",
        "plan_type": "SERVICE_STANDARD",
        "category": "SERVICE",
        "price": Decimal("39.00"),
        "duration_days": 30,
        "product_limit": None,
        "product_image_limit": 1,
        "service_enabled": True,
        "advanced_stats": False,
        "visibility_level": 1,
        "boosts_allowed": False,
        "sort_order": 40,
    },
    {
        "code": "SERVICE_PRO",
        "name": "Services Premium",
        "plan_type": "SERVICE_PRO",
        "category": "SERVICE",
        "price": Decimal("79.00"),
        "duration_days": 30,
        "product_limit": None,
        "product_image_limit": 1,
        "service_enabled": True,
        "advanced_stats": True,
        "visibility_level": 2,
        "boosts_allowed": True,
        "sort_order": 50,
    },
]

BOOSTS = [
    {
        "code": "BOOST_7D",
        "name": "Boost 7 jours",
        "duration_days": 7,
        "price": Decimal("15.00"),
    },
    {
        "code": "BOOST_30D",
        "name": "Boost 30 jours",
        "duration_days": 30,
        "price": Decimal("39.00"),
    },
]

PAYMENT_METHODS = [
    {
        "name": "Orange Money",
        "account_name": "SERVIS",
        "account_number": "À renseigner dans l'espace admin",
        "instructions": (
            "Envoyez le montant exact de l'abonnement, puis envoyez "
            "une capture d'écran depuis cette page."
        ),
        "sort_order": 10,
    },
    {
        "name": "Inwi Money",
        "account_name": "SERVIS",
        "account_number": "À renseigner dans l'espace admin",
        "instructions": (
            "Envoyez le montant exact, puis uploadez la capture "
            "de confirmation."
        ),
        "sort_order": 20,
    },
    {
        "name": "Cash Plus",
        "account_name": "SERVIS",
        "account_number": "À renseigner dans l'espace admin",
        "instructions": (
            "Déposez le montant au guichet Cash Plus, conservez le "
            "reçu et uploadez-le ici."
        ),
        "sort_order": 30,
    },
    {
        "name": "Virement bancaire",
        "account_name": "SERVIS",
        "account_number": "À renseigner dans l'espace admin",
        "instructions": (
            "Indiquez votre e-mail SERVIS en motif du virement, "
            "puis uploadez le reçu."
        ),
        "sort_order": 40,
    },
]


def apply_billing_catalog(*, Plan, BoostPackage, PlatformPaymentMethod) -> None:
    """Idempotent upsert used by seed_billing and migrations."""
    for data in PLANS:
        Plan.objects.update_or_create(
            code=data["code"],
            defaults={**data, "is_active": True},
        )
    for data in BOOSTS:
        BoostPackage.objects.update_or_create(
            code=data["code"],
            defaults={**data, "is_active": True},
        )
    if not PlatformPaymentMethod.objects.exists():
        for data in PAYMENT_METHODS:
            PlatformPaymentMethod.objects.create(
                **data,
                is_active=True,
            )
