"""Dispute API tests."""

from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.disputes.models import Dispute, DisputeStatus
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.products.models import Product, ProductStatus
from apps.stores.models import City, Store, StoreStatus
from apps.users.choices import UserRole
from apps.users.models import User


def make_user(email, role):
    return User.objects.create_user(
        email=email,
        password="SecurePass123!",
        first_name="T",
        last_name="U",
        role=role,
    )


class DisputeAPITests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger-disp", region="Nord", is_active=True
        )
        self.client_u = make_user("client.disp@servis.ma", UserRole.CLIENT)
        self.seller = make_user("seller.disp@servis.ma", UserRole.SELLER)
        self.admin = make_user("admin.disp@servis.ma", UserRole.ADMIN)
        self.store = Store.objects.create(
            owner=self.seller,
            name="Boutique Disp",
            slug="boutique-disp",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.product = Product.objects.create(
            store=self.store,
            name="Item",
            slug="item-disp",
            price=Decimal("50.00"),
            stock=5,
            status=ProductStatus.ACTIVE,
        )
        self.order = Order.objects.create(
            user=self.client_u,
            store=self.store,
            status=OrderStatus.COMPLETED,
            total_amount=Decimal("50.00"),
            store_name_snapshot=self.store.name,
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_name_snapshot="Item",
            unit_price=Decimal("50.00"),
            quantity=1,
            subtotal=Decimal("50.00"),
        )

    def test_client_opens_and_seller_replies_admin_resolves(self):
        self.client.force_authenticate(self.client_u)
        created = self.client.post(
            reverse("dispute-list-create"),
            {
                "order_id": str(self.order.id),
                "reason": "NOT_RECEIVED",
                "description": "Je n'ai jamais reçu ma commande.",
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        dispute_id = created.data["id"]

        self.client.force_authenticate(self.seller)
        reply = self.client.post(
            reverse("seller-dispute-reply", kwargs={"dispute_id": dispute_id}),
            {"reply": "Nous allons renvoyer le colis demain."},
            format="json",
        )
        self.assertEqual(reply.status_code, status.HTTP_200_OK)
        self.assertEqual(reply.data["status"], DisputeStatus.SELLER_REPLIED)

        self.client.force_authenticate(self.admin)
        resolved = self.client.post(
            reverse("admin-dispute-resolve", kwargs={"dispute_id": dispute_id}),
            {"status": "RESOLVED", "admin_note": "Colis renvoyé."},
            format="json",
        )
        self.assertEqual(resolved.status_code, status.HTTP_200_OK)
        self.assertEqual(resolved.data["status"], DisputeStatus.RESOLVED)
        self.assertEqual(Dispute.objects.count(), 1)

    def test_cannot_open_on_pending_order(self):
        self.order.status = OrderStatus.PENDING
        self.order.save(update_fields=["status"])
        self.client.force_authenticate(self.client_u)
        res = self.client.post(
            reverse("dispute-list-create"),
            {
                "order_id": str(self.order.id),
                "reason": "OTHER",
                "description": "Trop tôt pour un litige ici.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
