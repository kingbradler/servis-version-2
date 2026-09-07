"""Tests for admin users + seller/admin stats endpoints."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.billing.models import (
    Plan,
    PlanCategory,
    PlanType,
    Subscription,
    SubscriptionStatus,
)
from apps.orders.models import Order, OrderStatus
from apps.payments.models import Payment, PaymentMethod, PaymentMethodType, PaymentStatus
from apps.products.models import Product, ProductStatus
from apps.stores.models import City, Store, StoreStatus
from apps.users.choices import UserRole

User = get_user_model()
PASSWORD = "SecurePass123!"
ADMIN_USERS_URL = reverse("admin-user-list")
ADMIN_STATS_URL = reverse("admin-stats")
SELLER_STATS_URL = reverse("seller_store:stats")
SELLER_ADVANCED_STATS_URL = reverse("seller_store:stats-advanced")


def user_detail_url(user_id):
    return reverse("admin-user-detail", kwargs={"user_id": user_id})


def make_user(email, role, **extra):
    return User.objects.create_user(
        email=email,
        password=PASSWORD,
        first_name="T",
        last_name="U",
        role=role,
        **extra,
    )


class AdminUsersAPITests(APITestCase):
    def setUp(self):
        self.admin = make_user("admin.users@example.com", UserRole.ADMIN)
        self.client_user = make_user("client.users@example.com", UserRole.CLIENT)
        self.seller = make_user("seller.users@example.com", UserRole.SELLER)

    def test_list_users_admin_ok(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(ADMIN_USERS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 3)

    def test_list_users_filter_role(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(ADMIN_USERS_URL, {"role": UserRole.SELLER})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for row in response.data["results"]:
            self.assertEqual(row["role"], UserRole.SELLER)

    def test_list_users_forbidden_for_client(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(ADMIN_USERS_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_deactivate_user(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            user_detail_url(self.client_user.id),
            {"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_active"])
        self.client_user.refresh_from_db()
        self.assertFalse(self.client_user.is_active)

    def test_admin_cannot_deactivate_self(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            user_detail_url(self.admin.id),
            {"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_admin_cannot_demote_self(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            user_detail_url(self.admin.id),
            {"role": UserRole.CLIENT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class StatsAPITests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Rabat", slug="rabat-stats", region="Centre", is_active=True
        )
        self.admin = make_user("admin.stats@example.com", UserRole.ADMIN)
        self.seller = make_user("seller.stats@example.com", UserRole.SELLER)
        self.client_user = make_user("client.stats@example.com", UserRole.CLIENT)
        self.store = Store.objects.create(
            owner=self.seller,
            name="Stats Shop",
            slug="stats-shop",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.product = Product.objects.create(
            store=self.store,
            name="Widget",
            slug="widget-stats",
            price=Decimal("100.00"),
            stock=3,
            status=ProductStatus.ACTIVE,
        )
        self.order = Order.objects.create(
            user=self.client_user,
            store=self.store,
            status=OrderStatus.PENDING,
            total_amount=Decimal("100.00"),
            store_name_snapshot=self.store.name,
        )
        method = PaymentMethod.objects.create(
            store=self.store,
            type=PaymentMethodType.BANK_TRANSFER,
            label="RIB",
            account_name="Seller",
            account_number="0600000000",
            instructions="Payer",
            is_active=True,
        )
        Payment.objects.create(
            order=self.order,
            payment_method=method,
            amount=Decimal("100.00"),
            status=PaymentStatus.PROOF_SUBMITTED,
        )

    def test_seller_stats(self):
        self.client.force_authenticate(user=self.seller)
        response = self.client.get(SELLER_STATS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["products_count"], 1)
        self.assertEqual(response.data["products_active"], 1)
        self.assertEqual(response.data["orders_count"], 1)
        self.assertEqual(response.data["orders_pending"], 1)
        self.assertEqual(response.data["payments_proof_submitted"], 1)
        self.assertEqual(response.data["store"]["slug"], "stats-shop")

    def test_seller_stats_without_store(self):
        seller2 = make_user("seller.nostore@example.com", UserRole.SELLER)
        self.client.force_authenticate(user=seller2)
        response = self.client.get(SELLER_STATS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["store"])
        self.assertEqual(response.data["products_count"], 0)

    def test_seller_stats_forbidden_for_client(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(SELLER_STATS_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_stats(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(ADMIN_STATS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["users_count"], 3)
        self.assertGreaterEqual(response.data["stores_count"], 1)
        self.assertGreaterEqual(response.data["products_count"], 1)
        self.assertGreaterEqual(response.data["orders_count"], 1)
        self.assertGreaterEqual(response.data["payments_proof_submitted"], 1)

    def test_admin_stats_forbidden_for_seller(self):
        self.client.force_authenticate(user=self.seller)
        response = self.client.get(ADMIN_STATS_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_advanced_stats_requires_pro(self):
        self.client.force_authenticate(user=self.seller)
        response = self.client.get(SELLER_ADVANCED_STATS_URL)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error_code"], "advanced_stats_required")

    def test_advanced_stats_with_store_pro(self):
        plan = Plan.objects.get(code=PlanType.STORE_PRO)
        Subscription.objects.create(
            owner=self.seller,
            plan=plan,
            category=PlanCategory.STORE,
            status=SubscriptionStatus.ACTIVE,
            starts_at=timezone.now() - timedelta(days=1),
            activated_at=timezone.now() - timedelta(days=1),
            expires_at=timezone.now() + timedelta(days=29),
        )
        Payment.objects.filter(order=self.order).update(
            status=PaymentStatus.CONFIRMED,
            amount=Decimal("100.00"),
        )
        self.order.status = OrderStatus.COMPLETED
        self.order.save(update_fields=["status"])

        self.client.force_authenticate(user=self.seller)
        response = self.client.get(
            SELLER_ADVANCED_STATS_URL, {"period": "30d"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["period"], "30d")
        self.assertEqual(response.data["currency"], "MAD")
        self.assertEqual(response.data["revenue_confirmed"], "100.00")
        self.assertEqual(response.data["orders_count"], 1)
        self.assertEqual(response.data["orders_completed"], 1)
        self.assertEqual(response.data["avg_order_value"], "100.00")
        self.assertEqual(response.data["products_active"], 1)
