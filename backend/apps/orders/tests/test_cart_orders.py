"""Tests for Cart and Orders (Phase 3.4)."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.orders.models import CartItem, Order, OrderItem, OrderStatus
from apps.products.models import Product, ProductStatus
from apps.stores.models import City, Store, StoreStatus
from apps.users.choices import UserRole

User = get_user_model()
PASSWORD = "SecurePass123!"

DELIVERY = {
    "delivery_name": "Client Test",
    "delivery_phone": "+212612345678",
    "delivery_address": "12 Rue de la Kasbah",
    "delivery_city": "Tanger",
    "delivery_notes": "Sonner 2 fois",
}


def make_user(email, role):
    return User.objects.create_user(
        email=email,
        password=PASSWORD,
        first_name="T",
        last_name="U",
        role=role,
    )


class CartOrderBase(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger", region="Nord", is_active=True
        )
        self.client_a = make_user("client.a@servis.ma", UserRole.CLIENT)
        self.client_b = make_user("client.b@servis.ma", UserRole.CLIENT)
        self.seller = make_user("seller.orders@servis.ma", UserRole.SELLER)
        self.seller_b = make_user("seller.b.orders@servis.ma", UserRole.SELLER)
        self.admin = make_user("admin.orders@servis.ma", UserRole.ADMIN)

        self.store = Store.objects.create(
            owner=self.seller,
            name="Chez Romaric",
            slug="chez-romaric",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.store_b = Store.objects.create(
            owner=self.seller_b,
            name="Autre Boutique",
            slug="autre-boutique",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.product = Product.objects.create(
            store=self.store,
            name="Samsung Galaxy A55",
            slug="samsung-galaxy-a55",
            price=Decimal("2500.00"),
            stock=10,
            status=ProductStatus.ACTIVE,
        )
        self.product_b = Product.objects.create(
            store=self.store_b,
            name="Cahier",
            slug="cahier",
            price=Decimal("15.00"),
            stock=5,
            status=ProductStatus.ACTIVE,
        )
        self.draft_product = Product.objects.create(
            store=self.store,
            name="Draft Phone",
            slug="draft-phone",
            price=Decimal("100.00"),
            stock=5,
            status=ProductStatus.DRAFT,
        )

        self.cart_url = reverse("cart:detail")
        self.items_url = reverse("cart:items")
        self.orders_url = reverse("orders:list-create")


class CartTests(CartOrderBase):
    def test_add_product(self):
        self.client.force_authenticate(user=self.client_a)
        response = self.client.post(
            self.items_url,
            {"product_id": str(self.product.id), "quantity": 2},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["quantity"], 2)
        self.assertEqual(response.data["total_amount"], "5000.00")

    def test_invalid_quantity(self):
        self.client.force_authenticate(user=self.client_a)
        response = self.client.post(
            self.items_url,
            {"product_id": str(self.product.id), "quantity": 0},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_product(self):
        self.client.force_authenticate(user=self.client_a)
        response = self.client.post(
            self.items_url,
            {"product_id": "00000000-0000-0000-0000-000000000099", "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_inactive_product(self):
        self.client.force_authenticate(user=self.client_a)
        response = self.client.post(
            self.items_url,
            {"product_id": str(self.draft_product.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_store(self):
        self.store.status = StoreStatus.SUSPENDED
        self.store.save(update_fields=["status"])
        self.client.force_authenticate(user=self.client_a)
        response = self.client.post(
            self.items_url,
            {"product_id": str(self.product.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_stock_overflow(self):
        self.client.force_authenticate(user=self.client_a)
        response = self.client.post(
            self.items_url,
            {"product_id": str(self.product.id), "quantity": 99},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_and_delete_item(self):
        self.client.force_authenticate(user=self.client_a)
        add = self.client.post(
            self.items_url,
            {"product_id": str(self.product.id), "quantity": 1},
            format="json",
        )
        item_id = add.data["items"][0]["id"]
        url = reverse("cart:item-detail", kwargs={"item_id": item_id})
        patch = self.client.patch(url, {"quantity": 3}, format="json")
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data["items"][0]["quantity"], 3)
        delete = self.client.delete(url)
        self.assertEqual(delete.status_code, status.HTTP_200_OK)
        self.assertEqual(len(delete.data["items"]), 0)

    def test_clear_cart(self):
        self.client.force_authenticate(user=self.client_a)
        self.client.post(
            self.items_url,
            {"product_id": str(self.product.id), "quantity": 1},
            format="json",
        )
        response = self.client.delete(self.cart_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["items"]), 0)

    def test_isolation_between_clients(self):
        self.client.force_authenticate(user=self.client_a)
        add = self.client.post(
            self.items_url,
            {"product_id": str(self.product.id), "quantity": 1},
            format="json",
        )
        item_id = add.data["items"][0]["id"]

        self.client.force_authenticate(user=self.client_b)
        other = self.client.get(self.cart_url)
        self.assertEqual(len(other.data["items"]), 0)
        steal = self.client.patch(
            reverse("cart:item-detail", kwargs={"item_id": item_id}),
            {"quantity": 5},
            format="json",
        )
        self.assertEqual(steal.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_401(self):
        response = self.client.get(self.cart_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_seller_can_use_cart(self):
        """Sellers may also shop (CanShop)."""
        self.client.force_authenticate(user=self.seller)
        response = self.client.get(self.cart_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ignores_client_price(self):
        self.client.force_authenticate(user=self.client_a)
        response = self.client.post(
            self.items_url,
            {
                "product_id": str(self.product.id),
                "quantity": 1,
                "price": "1.00",
                "unit_price": "1.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_amount"], "2500.00")


class OrderTests(CartOrderBase):
    def _fill_cart(self, user, product, qty=2):
        self.client.force_authenticate(user=user)
        return self.client.post(
            self.items_url,
            {"product_id": str(product.id), "quantity": qty},
            format="json",
        )

    def test_create_order_snapshots_and_stock(self):
        self._fill_cart(self.client_a, self.product, qty=2)
        # Change live product after cart add — order must snapshot current DB price at checkout
        self.product.name = "Nouveau Nom"
        self.product.price = Decimal("2600.00")
        self.product.save()

        response = self.client.post(self.orders_url, DELIVERY, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["count"], 1)
        order = response.data["orders"][0]
        self.assertEqual(order["status"], OrderStatus.PENDING)
        self.assertEqual(order["total_amount"], "5200.00")
        item = order["items"][0]
        self.assertEqual(item["product_name_snapshot"], "Nouveau Nom")
        self.assertEqual(item["unit_price"], "2600.00")
        self.assertEqual(item["quantity"], 2)
        self.assertEqual(item["subtotal"], "5200.00")

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

        cart = self.client.get(self.cart_url)
        self.assertEqual(len(cart.data["items"]), 0)

        db_order = Order.objects.get(pk=order["id"])
        self.assertEqual(db_order.user_id, self.client_a.id)
        self.assertEqual(db_order.delivery_name, DELIVERY["delivery_name"])
        self.assertEqual(db_order.delivery_phone, DELIVERY["delivery_phone"])
        self.assertEqual(db_order.delivery_address, DELIVERY["delivery_address"])
        self.assertEqual(OrderItem.objects.filter(order=db_order).count(), 1)

    def test_multi_store_creates_multiple_orders(self):
        self._fill_cart(self.client_a, self.product, qty=1)
        self.client.post(
            self.items_url,
            {"product_id": str(self.product_b.id), "quantity": 2},
            format="json",
        )
        response = self.client.post(self.orders_url, DELIVERY, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["count"], 2)
        totals = sorted(o["total_amount"] for o in response.data["orders"])
        self.assertEqual(totals, ["2500.00", "30.00"])

    def test_insufficient_stock_at_checkout(self):
        self._fill_cart(self.client_a, self.product, qty=2)
        self.product.stock = 1
        self.product.save(update_fields=["stock"])
        response = self.client.post(self.orders_url, DELIVERY, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 1)
        self.assertEqual(CartItem.objects.filter(cart__user=self.client_a).count(), 1)

    def test_empty_cart_checkout(self):
        self.client.force_authenticate(user=self.client_a)
        response = self.client.post(self.orders_url, DELIVERY, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_order_isolation(self):
        self._fill_cart(self.client_a, self.product, qty=1)
        created = self.client.post(self.orders_url, DELIVERY, format="json")
        order_id = created.data["orders"][0]["id"]

        self.client.force_authenticate(user=self.client_b)
        detail = self.client.get(reverse("orders:detail", kwargs={"order_id": order_id}))
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)
        listing = self.client.get(self.orders_url)
        self.assertEqual(listing.data["count"], 0)

    def test_list_my_orders(self):
        self._fill_cart(self.client_a, self.product, qty=1)
        self.client.post(self.orders_url, DELIVERY, format="json")
        listing = self.client.get(self.orders_url)
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(listing.data["count"], 1)

    def test_unauthenticated_orders_401(self):
        response = self.client.get(self.orders_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_seller_can_access_client_orders_endpoint(self):
        """Sellers may also place / list their own client orders."""
        self.client.force_authenticate(user=self.seller)
        response = self.client.get(self.orders_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_seller_sees_own_store_orders_only(self):
        self._fill_cart(self.client_a, self.product, qty=1)
        self.client.post(self.orders_url, DELIVERY, format="json")
        self._fill_cart(self.client_a, self.product_b, qty=1)
        self.client.post(self.orders_url, DELIVERY, format="json")

        self.client.force_authenticate(user=self.seller)
        response = self.client.get(reverse("seller_orders:list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["store"]["slug"], "chez-romaric")

        foreign = Order.objects.filter(store=self.store_b).first()
        steal = self.client.get(
            reverse("seller_orders:detail", kwargs={"order_id": foreign.id})
        )
        self.assertEqual(steal.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_lists_orders(self):
        self._fill_cart(self.client_a, self.product, qty=1)
        self.client.post(self.orders_url, DELIVERY, format="json")
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/admin/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)

    def test_rejects_client_supplied_total(self):
        self._fill_cart(self.client_a, self.product, qty=1)
        response = self.client.post(
            self.orders_url,
            {"total_amount": "1.00", "price": "1.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_second_checkout_empty_after_success(self):
        self._fill_cart(self.client_a, self.product, qty=1)
        first = self.client.post(self.orders_url, DELIVERY, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(self.orders_url, DELIVERY, format="json")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.filter(user=self.client_a).count(), 1)

    def test_stock_zero_marks_out_of_stock(self):
        self.product.stock = 2
        self.product.save(update_fields=["stock"])
        self._fill_cart(self.client_a, self.product, qty=2)
        response = self.client.post(self.orders_url, DELIVERY, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assertEqual(self.product.status, ProductStatus.OUT_OF_STOCK)

    def test_checkout_succeeds_when_seller_notification_fails(self):
        from unittest.mock import patch

        self._fill_cart(self.client_a, self.product, qty=1)
        with patch(
            "apps.notifications.services.notify_order_created",
            side_effect=RuntimeError("mail down"),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(self.orders_url, DELIVERY, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.filter(user=self.client_a).count(), 1)

    def test_checkout_creates_seller_notification(self):
        from apps.notifications.models import Notification, NotificationType

        self._fill_cart(self.client_a, self.product, qty=1)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self.orders_url, DELIVERY, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Notification.objects.filter(
                user=self.seller, type=NotificationType.ORDER_NEW
            ).exists()
        )


class ConcurrentCheckoutTests(APITestCase):
    """Sequential double-submit: second checkout must fail after cart cleared / stock gone."""

    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger-c", region="Nord", is_active=True
        )
        self.client_user = make_user("client.conc@servis.ma", UserRole.CLIENT)
        self.seller = make_user("seller.conc@servis.ma", UserRole.SELLER)
        self.store = Store.objects.create(
            owner=self.seller,
            name="Conc Store",
            slug="conc-store",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.product = Product.objects.create(
            store=self.store,
            name="Limited",
            slug="limited",
            price=Decimal("10.00"),
            stock=1,
            status=ProductStatus.ACTIVE,
        )

    def test_double_checkout_only_one_succeeds(self):
        self.client.force_authenticate(user=self.client_user)
        self.client.post(
            reverse("cart:items"),
            {"product_id": str(self.product.id), "quantity": 1},
            format="json",
        )
        first = self.client.post(reverse("orders:list-create"), DELIVERY, format="json")
        second = self.client.post(reverse("orders:list-create"), DELIVERY, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assertEqual(Order.objects.filter(user=self.client_user).count(), 1)
