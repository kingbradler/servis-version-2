"""Idempotent seed for billing plans, boost packages, and example payment methods."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.billing.models import (
    BoostPackage,
    Plan,
    PlanCategory,
    PlanType,
    PlatformPaymentMethod,
)

PLANS = [
    {
        "code": PlanType.STORE_FREE,
        "name": "Boutique Free",
        "plan_type": PlanType.STORE_FREE,
        "category": PlanCategory.STORE,
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
        "code": PlanType.STORE_STANDARD,
        "name": "Boutique Standard",
        "plan_type": PlanType.STORE_STANDARD,
        "category": PlanCategory.STORE,
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
        "code": PlanType.STORE_PRO,
        "name": "Boutique Pro",
        "plan_type": PlanType.STORE_PRO,
        "category": PlanCategory.STORE,
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
        "code": PlanType.SERVICE_STANDARD,
        "name": "Services Standard",
        "plan_type": PlanType.SERVICE_STANDARD,
        "category": PlanCategory.SERVICE,
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
        "code": PlanType.SERVICE_PRO,
        "name": "Services Pro",
        "plan_type": PlanType.SERVICE_PRO,
        "category": PlanCategory.SERVICE,
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


class Command(BaseCommand):
    help = "Seed billing plans, boost packages, and placeholder SERVIS payment methods."

    def handle(self, *args, **options):
        for data in PLANS:
            Plan.objects.update_or_create(
                code=data["code"],
                defaults={**data, "is_active": True},
            )
            self.stdout.write(f"Plan {data['code']}")

        for data in BOOSTS:
            BoostPackage.objects.update_or_create(
                code=data["code"],
                defaults={**data, "is_active": True},
            )
            self.stdout.write(f"Boost {data['code']}")

        if not PlatformPaymentMethod.objects.exists():
            PlatformPaymentMethod.objects.create(
                name="Orange Money",
                account_name="SERVIS",
                account_number="À renseigner dans l'espace admin",
                instructions=(
                    "Envoyez le montant exact de l'abonnement, puis envoyez "
                    "une capture d'écran depuis cette page."
                ),
                is_active=True,
                sort_order=10,
            )
            PlatformPaymentMethod.objects.create(
                name="Inwi Money",
                account_name="SERVIS",
                account_number="À renseigner dans l'espace admin",
                instructions=(
                    "Envoyez le montant exact, puis uploadez la capture "
                    "de confirmation."
                ),
                is_active=True,
                sort_order=20,
            )
            PlatformPaymentMethod.objects.create(
                name="Cash Plus",
                account_name="SERVIS",
                account_number="À renseigner dans l'espace admin",
                instructions=(
                    "Déposez le montant au guichet Cash Plus, conservez le "
                    "reçu et uploadez-le ici."
                ),
                is_active=True,
                sort_order=30,
            )
            PlatformPaymentMethod.objects.create(
                name="Virement bancaire",
                account_name="SERVIS",
                account_number="À renseigner dans l'espace admin",
                instructions=(
                    "Indiquez votre e-mail SERVIS en motif du virement, "
                    "puis uploadez le reçu."
                ),
                is_active=True,
                sort_order=40,
            )
            self.stdout.write("Created placeholder platform payment methods")

        self.stdout.write(self.style.SUCCESS("Billing seed OK"))
