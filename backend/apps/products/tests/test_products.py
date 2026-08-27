"""Tests for Product / ProductImage APIs (Phase 3.3)."""

from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.categories.models import Category
from apps.products.models import Product, ProductImage, ProductStatus
from apps.stores.models import City, Store, StoreStatus
from apps.users.choices import UserRole

User = get_user_model()
PASSWORD = "SecurePass123!"


def make_user(email, role):
    return User.objects.create_user(
        email=email,
        password=PASSWORD,
        first_name="T",
        last_name="U",
        role=role,
    )


def make_jpeg(name="photo.jpg", size=(40, 40), color=(200, 80, 40)):
    buf = BytesIO()
    Image.new("RGB", size, color).save(buf, format="JPEG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


class ProductAPITestCase(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger",
            slug="tanger",
            region="Tanger-Tétouan-Al Hoceïma",
            is_active=True,
        )
        self.category = Category.objects.create(
            name="Électronique",
            slug="electronique",
            is_active=True,
        )
        self.inactive_category = Category.objects.create(
            name="Inactive Cat",
            slug="inactive-cat",
            is_active=False,
        )
        self.seller_a = make_user("seller.a.prod@servis.ma", UserRole.SELLER)
        self.seller_b = make_user("seller.b.prod@servis.ma", UserRole.SELLER)
        self.seller_nostore = make_user("seller.nostore@servis.ma", UserRole.SELLER)
        self.client_user = make_user("client.prod@servis.ma", UserRole.CLIENT)
        self.admin = make_user("admin.prod@servis.ma", UserRole.ADMIN)

        self.store_a = Store.objects.create(
            owner=self.seller_a,
            name="Chez Romaric",
            slug="chez-romaric",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.store_b = Store.objects.create(
            owner=self.seller_b,
            name="Boutique B",
            slug="boutique-b",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )

        self.list_url = reverse("seller_products:list-create")
        self.public_list = reverse("products:list")


class ProductCreationTests(ProductAPITestCase):
    def test_seller_with_active_store_can_create(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.list_url,
            {
                "name": "Samsung Galaxy A55",
                "description": "Téléphone étudiant",
                "category": str(self.category.id),
                "price": "2500.00",
                "compare_price": "2800.00",
                "stock": 4,
                "is_featured": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ProductStatus.DRAFT)
        self.assertEqual(response.data["slug"], "samsung-galaxy-a55")
        product = Product.objects.get(pk=response.data["id"])
        self.assertEqual(product.store_id, self.store_a.id)

    def test_seller_without_store_cannot_create(self):
        self.client.force_authenticate(user=self.seller_nostore)
        response = self.client.post(
            self.list_url,
            {"name": "X", "price": "10.00", "stock": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_cannot_create(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            self.list_url,
            {"name": "Hack", "price": "10.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_store_in_payload_rejected(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.list_url,
            {
                "name": "Mine",
                "price": "100.00",
                "stock": 1,
                "store": str(self.store_b.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_use_seller_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.list_url,
            {"name": "Admin Prod", "price": "10.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ProductIsolationTests(ProductAPITestCase):
    def setUp(self):
        super().setUp()
        self.product_a = Product.objects.create(
            store=self.store_a,
            name="Produit A",
            slug="produit-a",
            price=Decimal("50.00"),
            stock=2,
            status=ProductStatus.DRAFT,
        )
        self.product_b = Product.objects.create(
            store=self.store_b,
            name="Produit B",
            slug="produit-b",
            price=Decimal("60.00"),
            stock=2,
            status=ProductStatus.DRAFT,
        )

    def test_seller_lists_only_own_products(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [p["id"] for p in response.data["results"]]
        self.assertIn(str(self.product_a.id), ids)
        self.assertNotIn(str(self.product_b.id), ids)

    def test_seller_cannot_get_other_product(self):
        self.client.force_authenticate(user=self.seller_a)
        url = reverse("seller_products:detail", kwargs={"product_id": self.product_b.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_seller_cannot_patch_other_product(self):
        self.client.force_authenticate(user=self.seller_a)
        url = reverse("seller_products:detail", kwargs={"product_id": self.product_b.id})
        response = self.client.patch(url, {"name": "Stolen"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_seller_cannot_delete_other_product(self):
        self.client.force_authenticate(user=self.seller_a)
        url = reverse("seller_products:detail", kwargs={"product_id": self.product_b.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.product_b.refresh_from_db()
        self.assertEqual(self.product_b.status, ProductStatus.DRAFT)


class ProductPriceStockTests(ProductAPITestCase):
    def test_price_rules(self):
        self.client.force_authenticate(user=self.seller_a)
        for price, code in [("0", 400), ("-1", 400), ("120.00", 201)]:
            response = self.client.post(
                self.list_url,
                {"name": f"P{price}", "price": price, "stock": 1},
                format="json",
            )
            self.assertEqual(response.status_code, code, msg=price)

    def test_compare_price_must_be_higher(self):
        self.client.force_authenticate(user=self.seller_a)
        bad = self.client.post(
            self.list_url,
            {"name": "Bad Compare", "price": "150.00", "compare_price": "120.00", "stock": 1},
            format="json",
        )
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)
        good = self.client.post(
            self.list_url,
            {"name": "Good Compare", "price": "120.00", "compare_price": "150.00", "stock": 1},
            format="json",
        )
        self.assertEqual(good.status_code, status.HTTP_201_CREATED)

    def test_stock_rules(self):
        self.client.force_authenticate(user=self.seller_a)
        zero = self.client.post(
            self.list_url,
            {"name": "Zero Stock", "price": "10.00", "stock": 0},
            format="json",
        )
        self.assertEqual(zero.status_code, status.HTTP_201_CREATED)
        neg = self.client.post(
            self.list_url,
            {"name": "Neg Stock", "price": "10.00", "stock": -1},
            format="json",
        )
        self.assertEqual(neg.status_code, status.HTTP_400_BAD_REQUEST)

    def test_active_becomes_out_of_stock_when_stock_zero(self):
        product = Product.objects.create(
            store=self.store_a,
            name="Stock Edge",
            slug="stock-edge",
            price=Decimal("10.00"),
            stock=2,
            status=ProductStatus.ACTIVE,
        )
        self.client.force_authenticate(user=self.seller_a)
        url = reverse("seller_products:detail", kwargs={"product_id": product.id})
        response = self.client.patch(url, {"stock": 0}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ProductStatus.OUT_OF_STOCK)


class ProductStatusTests(ProductAPITestCase):
    def _product(self, **kwargs):
        defaults = {
            "store": self.store_a,
            "name": "Status Prod",
            "slug": "status-prod",
            "price": Decimal("20.00"),
            "stock": 3,
            "status": ProductStatus.DRAFT,
        }
        defaults.update(kwargs)
        return Product.objects.create(**defaults)

    def test_publish_requires_active_store(self):
        for store_status in (
            StoreStatus.DRAFT,
            StoreStatus.PENDING,
            StoreStatus.SUSPENDED,
        ):
            self.store_a.status = store_status
            self.store_a.save(update_fields=["status"])
            product = self._product(slug=f"p-{store_status.lower()}")
            self.client.force_authenticate(user=self.seller_a)
            url = reverse("seller_products:publish", kwargs={"product_id": product.id})
            response = self.client.post(url)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, store_status)

        self.store_a.status = StoreStatus.ACTIVE
        self.store_a.save(update_fields=["status"])
        product = self._product(slug="p-ok")
        self.client.force_authenticate(user=self.seller_a)
        url = reverse("seller_products:publish", kwargs={"product_id": product.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ProductStatus.ACTIVE)

    def test_publish_zero_stock_becomes_out_of_stock(self):
        product = self._product(slug="zero-pub", stock=0)
        self.client.force_authenticate(user=self.seller_a)
        url = reverse("seller_products:publish", kwargs={"product_id": product.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ProductStatus.OUT_OF_STOCK)

    def test_delete_archives(self):
        product = self._product(slug="to-archive", status=ProductStatus.ACTIVE)
        self.client.force_authenticate(user=self.seller_a)
        url = reverse("seller_products:detail", kwargs={"product_id": product.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ProductStatus.ARCHIVED)
        self.assertTrue(Product.objects.filter(pk=product.id).exists())

    def test_seller_cannot_set_status_via_patch(self):
        product = self._product()
        self.client.force_authenticate(user=self.seller_a)
        url = reverse("seller_products:detail", kwargs={"product_id": product.id})
        response = self.client.patch(url, {"status": ProductStatus.ACTIVE}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProductCategorySlugTests(ProductAPITestCase):
    def test_inactive_category_rejected(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.list_url,
            {
                "name": "Bad Cat",
                "price": "10.00",
                "stock": 1,
                "category": str(self.inactive_category.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_category_rejected(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.list_url,
            {
                "name": "No Cat",
                "price": "10.00",
                "stock": 1,
                "category": "00000000-0000-0000-0000-000000000099",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_slug_collision_same_store(self):
        Product.objects.create(
            store=self.store_a,
            name="Phone",
            slug="phone",
            price=Decimal("10.00"),
            stock=1,
        )
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.list_url,
            {"name": "Phone", "price": "12.00", "stock": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["slug"], "phone-2")

    def test_same_slug_allowed_different_stores(self):
        Product.objects.create(
            store=self.store_a,
            name="Phone",
            slug="phone",
            price=Decimal("10.00"),
            stock=1,
        )
        self.client.force_authenticate(user=self.seller_b)
        response = self.client.post(
            self.list_url,
            {"name": "Phone", "price": "12.00", "stock": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["slug"], "phone")


class ProductPublicTests(ProductAPITestCase):
    def setUp(self):
        super().setUp()
        self.visible = Product.objects.create(
            store=self.store_a,
            name="Visible Phone",
            slug="visible-phone",
            description="Samsung searchable",
            price=Decimal("100.00"),
            stock=5,
            status=ProductStatus.ACTIVE,
            category=self.category,
            is_featured=True,
        )
        self.draft = Product.objects.create(
            store=self.store_a,
            name="Draft",
            slug="draft-phone",
            price=Decimal("10.00"),
            stock=1,
            status=ProductStatus.DRAFT,
        )
        self.oos = Product.objects.create(
            store=self.store_a,
            name="OOS",
            slug="oos-phone",
            price=Decimal("10.00"),
            stock=0,
            status=ProductStatus.OUT_OF_STOCK,
        )
        self.archived = Product.objects.create(
            store=self.store_a,
            name="Archived",
            slug="archived-phone",
            price=Decimal("10.00"),
            stock=1,
            status=ProductStatus.ARCHIVED,
        )

    def test_public_visibility(self):
        response = self.client.get(self.public_list)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [p["slug"] for p in response.data["results"]]
        self.assertIn("visible-phone", slugs)
        self.assertNotIn("draft-phone", slugs)
        self.assertNotIn("oos-phone", slugs)
        self.assertNotIn("archived-phone", slugs)

    def test_suspended_store_hides_products(self):
        self.store_a.status = StoreStatus.SUSPENDED
        self.store_a.save(update_fields=["status"])
        response = self.client.get(self.public_list)
        slugs = [p["slug"] for p in response.data["results"]]
        self.assertNotIn("visible-phone", slugs)

    def test_public_detail_by_store_and_product_slug(self):
        url = reverse(
            "stores:product-detail",
            kwargs={"store_slug": "chez-romaric", "product_slug": "visible-phone"},
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["store"]["slug"], "chez-romaric")
        self.assertNotIn("owner_email", response.data)

    def test_filters_search_pagination(self):
        response = self.client.get(
            self.public_list,
            {
                "city": "tanger",
                "category": "electronique",
                "store": "chez-romaric",
                "min_price": "50",
                "max_price": "1000",
                "search": "Samsung",
                "featured": "true",
                "ordering": "-created_at",
                "page": 1,
                "page_size": 10,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["slug"], "visible-phone")


class ProductImageTests(ProductAPITestCase):
    def setUp(self):
        super().setUp()
        self.product = Product.objects.create(
            store=self.store_a,
            name="With Images",
            slug="with-images",
            price=Decimal("30.00"),
            stock=2,
            status=ProductStatus.DRAFT,
        )
        self.images_url = reverse(
            "seller_products:images", kwargs={"product_id": self.product.id}
        )

    def test_valid_image_upload(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.images_url,
            {"image": make_jpeg(), "alt_text": "Front"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["order"], 0)

    def test_invalid_type_rejected(self):
        self.client.force_authenticate(user=self.seller_a)
        fake = SimpleUploadedFile("x.exe", b"MZ\x90\x00notanimage", content_type="application/octet-stream")
        response = self.client.post(self.images_url, {"image": fake}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_rejected(self):
        self.client.force_authenticate(user=self.seller_a)
        huge = SimpleUploadedFile(
            "big.jpg",
            b"\xff\xd8\xff" + b"0" * (5 * 1024 * 1024 + 10),
            content_type="image/jpeg",
        )
        response = self.client.post(self.images_url, {"image": huge}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_max_images_respects_free_plan(self):
        self.client.force_authenticate(user=self.seller_a)
        ProductImage.objects.create(
            product=self.product,
            image="https://cdn.example.com/0.jpg",
            order=0,
        )
        response = self.client.post(
            self.images_url,
            {"image": make_jpeg("second.jpg")},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("product_image_limit", str(response.data))

    def test_image_order_unique(self):
        ProductImage.objects.create(
            product=self.product,
            image="https://cdn.example.com/0.jpg",
            order=0,
        )
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.post(
            self.images_url,
            {"image": make_jpeg(), "order": 0},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProductAdminSecurityTests(ProductAPITestCase):
    def setUp(self):
        super().setUp()
        self.product = Product.objects.create(
            store=self.store_a,
            name="Admin View",
            slug="admin-view",
            price=Decimal("40.00"),
            stock=1,
            status=ProductStatus.DRAFT,
        )

    def test_admin_lists_all_statuses(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/admin/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)

    def test_seller_cannot_access_admin(self):
        self.client.force_authenticate(user=self.seller_a)
        response = self.client.get("/api/v1/admin/products/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_change_role_via_product(self):
        self.client.force_authenticate(user=self.seller_a)
        url = reverse("seller_products:detail", kwargs={"product_id": self.product.id})
        response = self.client.patch(
            url,
            {"role": UserRole.ADMIN, "name": "Still Seller"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.seller_a.refresh_from_db()
        self.assertEqual(self.seller_a.role, UserRole.SELLER)

    def test_admin_archive_action(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f"/api/v1/admin/products/{self.product.id}/archive/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ProductStatus.ARCHIVED)
