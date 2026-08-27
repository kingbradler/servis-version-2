"""Tests for storage backends (local + mocked Supabase) and proof signing."""

from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.storage import (
    LocalStorageBackend,
    StorageError,
    SupabaseStorageBackend,
    build_avatar_path,
    build_payment_proof_path,
    build_product_image_path,
    build_store_banner_path,
    build_store_logo_path,
    extract_storage_path,
    get_storage_backend,
    resolve_local_signed_path,
    sign_private_url,
)
from apps.orders.models import Order, OrderStatus
from apps.payments.models import Payment, PaymentMethod, PaymentMethodType, PaymentStatus
from apps.stores.models import City, Store, StoreStatus
from apps.users.choices import UserRole
from decimal import Decimal

User = get_user_model()
PASSWORD = "SecurePass123!"


class PathBuilderTests(TestCase):
    def test_paths_use_uuid_not_user_filename(self):
        p = build_product_image_path("s1", "p1", "../../../evil.exe")
        self.assertTrue(p.startswith("products/s1/p1/"))
        self.assertTrue(p.endswith(".jpg"))
        self.assertNotIn("evil", p)

        proof = build_payment_proof_path("ord1", "scan.PDF")
        self.assertTrue(proof.startswith("payment-proofs/ord1/"))
        self.assertTrue(proof.endswith(".pdf"))

        self.assertTrue(build_store_logo_path("st").startswith("stores/st/logo/"))
        self.assertTrue(build_store_banner_path("st").startswith("stores/st/banner/"))
        self.assertTrue(build_avatar_path("u1").startswith("avatars/u1/"))

    def test_extract_storage_path(self):
        self.assertEqual(
            extract_storage_path("payment-proofs/o/x.jpg"),
            "payment-proofs/o/x.jpg",
        )
        self.assertEqual(
            extract_storage_path("/media/products/a/b/c.jpg"),
            "products/a/b/c.jpg",
        )
        self.assertEqual(
            extract_storage_path(
                "https://xyz.supabase.co/storage/v1/object/public/servis/products/a.jpg"
            ),
            "products/a.jpg",
        )


@override_settings(STORAGE_BACKEND="local")
class LocalStorageBackendTests(TestCase):
    def setUp(self):
        import tempfile

        self._td = tempfile.TemporaryDirectory()
        root = Path(self._td.name)
        self.public = root / "media"
        self.private = root / "private"
        self.public.mkdir()
        self.private.mkdir()
        self.backend = LocalStorageBackend(
            base_path=str(self.public),
            media_url="/media/",
            private_base_path=str(self.private),
            signed_url_base="/api/v1/storage/signed/",
        )

    def tearDown(self):
        self._td.cleanup()

    def test_public_upload_delete(self):
        bio = BytesIO(b"hello-image")
        url = self.backend.upload("products/s/p/a.jpg", bio, "image/jpeg", private=False)
        self.assertTrue(url.startswith("/media/products/"))
        self.assertTrue((self.public / "products/s/p/a.jpg").is_file())
        self.assertTrue(self.backend.delete("products/s/p/a.jpg", private=False))
        self.assertFalse((self.public / "products/s/p/a.jpg").is_file())

    def test_private_upload_signed_url(self):
        bio = BytesIO(b"%PDF-1.4 proof")
        key = self.backend.upload(
            "payment-proofs/ord/x.pdf", bio, "application/pdf", private=True
        )
        self.assertEqual(key, "payment-proofs/ord/x.pdf")
        self.assertTrue((self.private / key).is_file())
        signed = self.backend.get_signed_url(key)
        self.assertIn("/api/v1/storage/signed/", signed)
        token = signed.rstrip("/").split("/")[-1]
        from urllib.parse import unquote

        resolved = resolve_local_signed_path(unquote(token))
        self.assertEqual(resolved, key)

    def test_missing_file_delete(self):
        self.assertFalse(self.backend.delete("nope.jpg", private=False))


class SupabaseStorageBackendTests(TestCase):
    def test_missing_config_raises(self):
        backend = SupabaseStorageBackend("", "", "servis")
        with self.assertRaises(StorageError):
            backend.upload("a.jpg", BytesIO(b"x"), "image/jpeg")

    @patch("apps.core.storage.urllib.request.urlopen")
    def test_upload_public_and_signed(self, mock_urlopen):
        resp = MagicMock()
        resp.status = 200
        resp.read.return_value = b'{"signedURL": "/object/sign/servis-private/payment-proofs/o/a.jpg?token=abc"}'
        resp.__enter__.return_value = resp
        resp.__exit__.return_value = False
        mock_urlopen.return_value = resp

        backend = SupabaseStorageBackend(
            "https://example.supabase.co",
            "service-role-secret",
            "servis",
            private_bucket="servis-private",
        )
        url = backend.upload(
            "products/s/p/a.jpg", BytesIO(b"img"), "image/jpeg", private=False
        )
        self.assertIn("/object/public/servis/products/", url)

        key = backend.upload(
            "payment-proofs/o/a.jpg", BytesIO(b"pdf"), "application/pdf", private=True
        )
        self.assertEqual(key, "payment-proofs/o/a.jpg")

        signed = backend.get_signed_url("payment-proofs/o/a.jpg")
        self.assertIn("sign", signed)

    @patch("apps.core.storage.urllib.request.urlopen")
    def test_upload_http_error(self, mock_urlopen):
        import urllib.error

        mock_urlopen.side_effect = urllib.error.HTTPError(
            "https://x", 404, "Not Found", hdrs=None, fp=BytesIO(b"missing bucket")
        )
        backend = SupabaseStorageBackend(
            "https://example.supabase.co", "key", "servis"
        )
        with self.assertRaises(StorageError):
            backend.upload("a.jpg", BytesIO(b"x"), "image/jpeg")


class ProofSignedAccessAPITests(APITestCase):
    def setUp(self):
        import tempfile

        self._td = tempfile.TemporaryDirectory()
        root = Path(self._td.name)
        self.media = root / "media"
        self.private = root / "private"
        self.media.mkdir()
        self.private.mkdir()

        self.city = City.objects.create(
            name="Tanger", slug="tanger-st", region="Nord", is_active=True
        )
        self.client_a = User.objects.create_user(
            email="ca.st@servis.ma",
            password=PASSWORD,
            first_name="A",
            last_name="C",
            role=UserRole.CLIENT,
        )
        self.client_b = User.objects.create_user(
            email="cb.st@servis.ma",
            password=PASSWORD,
            first_name="B",
            last_name="C",
            role=UserRole.CLIENT,
        )
        self.seller_a = User.objects.create_user(
            email="sa.st@servis.ma",
            password=PASSWORD,
            first_name="A",
            last_name="S",
            role=UserRole.SELLER,
        )
        self.seller_b = User.objects.create_user(
            email="sb.st@servis.ma",
            password=PASSWORD,
            first_name="B",
            last_name="S",
            role=UserRole.SELLER,
        )
        self.admin = User.objects.create_user(
            email="admin.st@servis.ma",
            password=PASSWORD,
            first_name="Ad",
            last_name="Min",
            role=UserRole.ADMIN,
        )
        self.store_a = Store.objects.create(
            owner=self.seller_a,
            name="SA",
            slug="sa-st",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.store_b = Store.objects.create(
            owner=self.seller_b,
            name="SB",
            slug="sb-st",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.order_a = Order.objects.create(
            user=self.client_a,
            store=self.store_a,
            status=OrderStatus.PENDING,
            total_amount=Decimal("10.00"),
            store_name_snapshot="SA",
        )
        method = PaymentMethod.objects.create(
            store=self.store_a,
            type=PaymentMethodType.MOBILE_MONEY,
            label="OM",
            account_name="A",
            account_number="06",
            is_active=True,
        )
        self.payment = Payment.objects.create(
            order=self.order_a,
            payment_method=method,
            amount=Decimal("10.00"),
            status=PaymentStatus.PENDING,
        )

    def tearDown(self):
        self._td.cleanup()

    def _png(self):
        buf = BytesIO()
        Image.new("RGB", (8, 8), (1, 2, 3)).save(buf, format="PNG")
        return SimpleUploadedFile("p.png", buf.getvalue(), content_type="image/png")

    @override_settings(STORAGE_BACKEND="local")
    def test_proof_isolation_and_signed_url(self):
        with override_settings(
            MEDIA_ROOT=str(self.media),
            PRIVATE_MEDIA_ROOT=str(self.private),
        ):
            self.client.force_authenticate(user=self.client_a)
            resp = self.client.post(
                f"/api/v1/orders/{self.order_a.id}/payment/proof/",
                {"proof": self._png()},
                format="multipart",
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            proof_url = resp.data["proof"]
            self.assertTrue(proof_url)
            self.assertNotIn("service-role", proof_url.lower())
            # Stored as private key under private_media
            keys = list(self.private.rglob("*.png")) + list(self.private.rglob("*.jpg"))
            self.assertTrue(keys)

            # Client B cannot read payment
            self.client.force_authenticate(user=self.client_b)
            denied = self.client.get(f"/api/v1/orders/{self.order_a.id}/payment/")
            self.assertEqual(denied.status_code, status.HTTP_404_NOT_FOUND)

            # Seller B cannot read
            self.client.force_authenticate(user=self.seller_b)
            denied_s = self.client.get(
                f"/api/v1/seller/orders/{self.order_a.id}/payment/"
            )
            self.assertEqual(denied_s.status_code, status.HTTP_404_NOT_FOUND)

            # Seller A OK
            self.client.force_authenticate(user=self.seller_a)
            ok_s = self.client.get(
                f"/api/v1/seller/orders/{self.order_a.id}/payment/"
            )
            self.assertEqual(ok_s.status_code, status.HTTP_200_OK)
            self.assertTrue(ok_s.data["proof"])

            # Admin OK
            self.client.force_authenticate(user=self.admin)
            ok_a = self.client.get(f"/api/v1/admin/payments/{self.payment.id}/")
            self.assertEqual(ok_a.status_code, status.HTTP_200_OK)
            self.assertTrue(ok_a.data["proof"])
