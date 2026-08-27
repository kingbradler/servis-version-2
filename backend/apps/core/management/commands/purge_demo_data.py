"""
Purge fictional / test marketplace data so SERVIS looks production-ready.

Keeps: cities, categories, billing plans, platform payment methods, hero slides,
real users (non-test emails), and ADMIN accounts.

Removes marketplace content owned by test-looking accounts:
  *@t.ma, *@example.com, *@test.*, short local-part patterns from QA, etc.

Usage:
  python manage.py purge_demo_data --dry-run
  python manage.py purge_demo_data
  python manage.py purge_demo_data --include-users
"""

from __future__ import annotations

import re

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from apps.users.choices import UserRole
from apps.users.models import User

# Emails that look like automated / local QA junk — never touch ADMIN.
TEST_EMAIL_RE = re.compile(
    r"""
    (
      @t\.ma$
      | @example\.com$
      | @test\.
      | @localhost$
      | ^test\d*@
      | ^seller\d*@
      | ^client\d*@
      | ^admin\.?test@
      | ^s[0-9a-f]{4,}@
      | ^spay_
      | ^p3[a-z0-9_]*@
      | ^s4_
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)


def is_test_email(email: str) -> bool:
    return bool(TEST_EMAIL_RE.search((email or "").strip().lower()))


class Command(BaseCommand):
    help = "Supprime boutiques/services/produits fictifs (comptes de test)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Affiche ce qui serait supprimé sans écrire.",
        )
        parser.add_argument(
            "--include-users",
            action="store_true",
            help="Supprime aussi les comptes utilisateurs de test (hors ADMIN).",
        )
        parser.add_argument(
            "--all-marketplace",
            action="store_true",
            help=(
                "Supprime TOUTES les boutiques/produits/services "
                "(tous vendeurs non-admin). À utiliser avec prudence."
            ),
        )

    def handle(self, *args, **options):
        dry = options["dry_run"]
        include_users = options["include_users"]
        all_marketplace = options["all_marketplace"]

        if all_marketplace:
            owners = User.objects.exclude(role=UserRole.ADMIN)
        else:
            owners = User.objects.exclude(role=UserRole.ADMIN).filter(
                Q(email__iendswith="@t.ma")
                | Q(email__iendswith="@example.com")
                | Q(email__icontains="@test.")
            )
            # Also catch patterned locals on any domain
            extra_ids = [
                u.id
                for u in User.objects.exclude(role=UserRole.ADMIN)
                if is_test_email(u.email)
            ]
            owners = (owners | User.objects.filter(id__in=extra_ids)).distinct()

        owner_ids = list(owners.values_list("id", flat=True))
        self.stdout.write(f"Comptes ciblés: {len(owner_ids)}")
        for u in owners.order_by("email")[:40]:
            self.stdout.write(f"  - {u.role} {u.email}")

        from apps.billing.models import Boost, BoostPayment, Subscription, SubscriptionPayment
        from apps.messaging.models import Conversation
        from apps.orders.models import Cart, CartItem, Order, OrderItem
        from apps.payments.models import Payment, PaymentMethod, PaymentProof
        from apps.products.models import Product, ProductImage
        from apps.professionals.models import ProfessionalProfile
        from apps.reviews.models import Review
        from apps.services.models import Service, ServiceImage, ServiceRequest
        from apps.stores.models import Store

        stores = Store.objects.filter(owner_id__in=owner_ids)
        store_ids = list(stores.values_list("id", flat=True))
        products = Product.objects.filter(store_id__in=store_ids)
        product_ids = list(products.values_list("id", flat=True))
        pros = ProfessionalProfile.objects.filter(owner_id__in=owner_ids)
        pro_ids = list(pros.values_list("id", flat=True))
        services = Service.objects.filter(professional_profile_id__in=pro_ids)
        service_ids = list(services.values_list("id", flat=True))
        orders = Order.objects.filter(
            Q(store_id__in=store_ids) | Q(user_id__in=owner_ids)
        )
        order_ids = list(orders.values_list("id", flat=True))
        payments = Payment.objects.filter(order_id__in=order_ids)

        summary = {
            "stores": stores.count(),
            "products": products.count(),
            "product_images": ProductImage.objects.filter(
                product_id__in=product_ids
            ).count(),
            "professionals": pros.count(),
            "services": services.count(),
            "service_images": ServiceImage.objects.filter(
                service_id__in=service_ids
            ).count(),
            "service_requests": ServiceRequest.objects.filter(
                Q(service_id__in=service_ids)
                | Q(professional_id__in=pro_ids)
                | Q(client_id__in=owner_ids)
            ).count(),
            "orders": orders.count(),
            "order_items": OrderItem.objects.filter(order_id__in=order_ids).count(),
            "payments": payments.count(),
            "payment_proofs": PaymentProof.objects.filter(
                payment_id__in=payments.values_list("id", flat=True)
            ).count(),
            "payment_methods": PaymentMethod.objects.filter(
                store_id__in=store_ids
            ).count(),
            "cart_items": CartItem.objects.filter(product_id__in=product_ids).count(),
            "carts": Cart.objects.filter(user_id__in=owner_ids).count(),
            "reviews": Review.objects.filter(
                Q(author_id__in=owner_ids) | Q(professional_id__in=pro_ids)
            ).count(),
            "conversations": Conversation.objects.filter(
                Q(client_id__in=owner_ids) | Q(professional_id__in=pro_ids)
            ).count(),
            "subscriptions": Subscription.objects.filter(owner_id__in=owner_ids).count(),
            "subscription_payments": SubscriptionPayment.objects.filter(
                owner_id__in=owner_ids
            ).count(),
            "boosts": Boost.objects.filter(owner_id__in=owner_ids).count(),
            "boost_payments": BoostPayment.objects.filter(
                owner_id__in=owner_ids
            ).count(),
        }

        self.stdout.write("À supprimer:")
        for k, v in summary.items():
            self.stdout.write(f"  {k}: {v}")

        if dry:
            self.stdout.write(self.style.WARNING("Dry-run — aucune écriture."))
            return

        with transaction.atomic():
            # Reviews first (PROTECT on service_request)
            Review.objects.filter(
                Q(author_id__in=owner_ids) | Q(professional_id__in=pro_ids)
            ).delete()

            # Break PROTECT chains carefully
            PaymentProof.objects.filter(
                payment_id__in=payments.values_list("id", flat=True)
            ).delete()
            # Also proofs uploaded by test users on other payments
            PaymentProof.objects.filter(uploaded_by_id__in=owner_ids).delete()
            payments.delete()

            OrderItem.objects.filter(order_id__in=order_ids).delete()
            orders.delete()

            CartItem.objects.filter(product_id__in=product_ids).delete()
            Cart.objects.filter(user_id__in=owner_ids).delete()

            PaymentMethod.objects.filter(store_id__in=store_ids).delete()

            ServiceRequest.objects.filter(
                Q(service_id__in=service_ids)
                | Q(professional_id__in=pro_ids)
                | Q(client_id__in=owner_ids)
            ).delete()
            ServiceImage.objects.filter(service_id__in=service_ids).delete()
            services.delete()

            Conversation.objects.filter(
                Q(client_id__in=owner_ids) | Q(professional_id__in=pro_ids)
            ).delete()

            ProductImage.objects.filter(product_id__in=product_ids).delete()
            products.delete()
            stores.delete()
            pros.delete()

            SubscriptionPayment.objects.filter(owner_id__in=owner_ids).delete()
            Subscription.objects.filter(owner_id__in=owner_ids).delete()
            BoostPayment.objects.filter(owner_id__in=owner_ids).delete()
            Boost.objects.filter(owner_id__in=owner_ids).delete()

            if include_users:
                deleted, _ = (
                    User.objects.filter(id__in=owner_ids)
                    .exclude(role=UserRole.ADMIN)
                    .delete()
                )
                self.stdout.write(f"Utilisateurs test supprimés: {deleted}")

        self.stdout.write(self.style.SUCCESS("Nettoyage terminé — marketplace prête."))
