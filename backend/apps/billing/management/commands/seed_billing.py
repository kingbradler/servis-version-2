"""Idempotent seed for billing plans, boost packages, and example payment methods."""

from django.core.management.base import BaseCommand

from apps.billing.catalog import apply_billing_catalog
from apps.billing.models import BoostPackage, Plan, PlatformPaymentMethod


class Command(BaseCommand):
    help = "Seed billing plans, boost packages, and placeholder SERVIS payment methods."

    def handle(self, *args, **options):
        apply_billing_catalog(
            Plan=Plan,
            BoostPackage=BoostPackage,
            PlatformPaymentMethod=PlatformPaymentMethod,
        )
        self.stdout.write(self.style.SUCCESS("Billing seed OK"))
