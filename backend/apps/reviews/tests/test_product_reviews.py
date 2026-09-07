"""Product review API tests — additive."""

from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.orders.models import Order, OrderItem, OrderStatus
from apps.products.models import Product, ProductStatus
from apps.reviews.models import ProductReview
from apps.stores.models import City, Store, StoreStatus
from apps.users.choices import UserRole
from apps.users.models import User


def make_user(email: str, role: str) -> User:
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        first_name="Test",
        last_name="User",
        role=role,
    )


class ProductReviewAPITests(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger-prev", region="Nord", is_active=True
        )
        self.seller = make_user("seller.prev@servis.ma", UserRole.SELLER)
        self.client_user = make_user("client.prev@servis.ma", UserRole.CLIENT)
        self.other = make_user("other.prev@servis.ma", UserRole.CLIENT)

        self.store = Store.objects.create(
            owner=self.seller,
            name="Boutique Prev",
            slug="boutique-prev",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.product = Product.objects.create(
            store=self.store,
            name="Casque",
            slug="casque-prev",
            price=Decimal("99.00"),
            stock=10,
            status=ProductStatus.ACTIVE,
        )
        self.order = Order.objects.create(
            user=self.client_user,
            store=self.store,
            status=OrderStatus.COMPLETED,
            total_amount=Decimal("99.00"),
            store_name_snapshot=self.store.name,
        )
        self.item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_name_snapshot="Casque",
            unit_price=Decimal("99.00"),
            quantity=1,
            subtotal=Decimal("99.00"),
        )
        self.pending_order = Order.objects.create(
            user=self.client_user,
            store=self.store,
            status=OrderStatus.PENDING,
            total_amount=Decimal("99.00"),
            store_name_snapshot=self.store.name,
        )
        self.pending_item = OrderItem.objects.create(
            order=self.pending_order,
            product=self.product,
            product_name_snapshot="Casque",
            unit_price=Decimal("99.00"),
            quantity=1,
            subtotal=Decimal("99.00"),
        )

    def test_cannot_review_pending_order(self):
        self.client.force_authenticate(self.client_user)
        res = self.client.post(
            reverse("product-review-create"),
            {"order_item_id": str(self.pending_item.id), "rating": 5},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_review_confirmed_order(self):
        self.pending_order.status = OrderStatus.CONFIRMED
        self.pending_order.save(update_fields=["status"])
        self.client.force_authenticate(self.client_user)
        eligible = self.client.get(reverse("product-review-eligible"))
        ids = [row["id"] for row in eligible.data["results"]]
        self.assertIn(str(self.pending_item.id), ids)
        res = self.client.post(
            reverse("product-review-create"),
            {"order_item_id": str(self.pending_item.id), "rating": 4},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_create_product_review_flow(self):
        self.client.force_authenticate(self.client_user)
        eligible = self.client.get(reverse("product-review-eligible"))
        self.assertEqual(eligible.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in eligible.data["results"]]
        self.assertIn(str(self.item.id), ids)

        res = self.client.post(
            reverse("product-review-create"),
            {
                "order_item_id": str(self.item.id),
                "rating": 5,
                "comment": "Super produit",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["rating"], 5)
        self.assertEqual(ProductReview.objects.count(), 1)

        summary = self.client.get(
            reverse(
                "product-review-summary",
                kwargs={
                    "store_slug": self.store.slug,
                    "product_slug": self.product.slug,
                },
            )
        )
        self.assertEqual(summary.status_code, status.HTTP_200_OK)
        self.assertEqual(summary.data["ratings_count"], 1)
        self.assertEqual(summary.data["average_rating"], 5.0)

        dup = self.client.post(
            reverse("product-review-create"),
            {"order_item_id": str(self.item.id), "rating": 4},
            format="json",
        )
        self.assertEqual(dup.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_can_mark_order_completed(self):
        self.pending_order.status = OrderStatus.CONFIRMED
        self.pending_order.save(update_fields=["status"])
        self.client.force_authenticate(self.seller)
        res = self.client.post(
            reverse("seller_orders:complete", kwargs={"order_id": self.pending_order.id})
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.pending_order.refresh_from_db()
        self.assertEqual(self.pending_order.status, OrderStatus.COMPLETED)

    def test_other_client_cannot_review(self):
        self.client.force_authenticate(self.other)
        res = self.client.post(
            reverse("product-review-create"),
            {"order_item_id": str(self.item.id), "rating": 1},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
