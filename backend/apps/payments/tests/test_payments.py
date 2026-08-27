"""Tests for seller-owned manual payments (Phase 3.5 revised)."""

from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.orders.models import Order, OrderItem, OrderStatus
from apps.payments.models import Payment, PaymentMethod, PaymentMethodType, PaymentStatus
from apps.products.models import Product, ProductStatus
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


def make_image(name="proof.jpg", fmt="JPEG"):
    buf = BytesIO()
    Image.new("RGB", (32, 32), (10, 80, 160)).save(buf, format=fmt)
    ctype = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}[fmt]
    return SimpleUploadedFile(name, buf.getvalue(), content_type=ctype)


def make_pdf(name="proof.pdf"):
    content = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    return SimpleUploadedFile(name, content, content_type="application/pdf")


class PaymentBase(APITestCase):
    def setUp(self):
        self.city = City.objects.create(
            name="Tanger", slug="tanger", region="Nord", is_active=True
        )
        self.client_a = make_user("client.a.pay2@servis.ma", UserRole.CLIENT)
        self.client_b = make_user("client.b.pay2@servis.ma", UserRole.CLIENT)
        self.seller_a = make_user("seller.a.pay2@servis.ma", UserRole.SELLER)
        self.seller_b = make_user("seller.b.pay2@servis.ma", UserRole.SELLER)
        self.admin = make_user("admin.pay2@servis.ma", UserRole.ADMIN)

        self.store_a = Store.objects.create(
            owner=self.seller_a,
            name="Boutique A",
            slug="boutique-a-pay",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.store_b = Store.objects.create(
            owner=self.seller_b,
            name="Boutique B",
            slug="boutique-b-pay",
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.product = Product.objects.create(
            store=self.store_a,
            name="Item",
            slug="item-pay",
            price=Decimal("250.00"),
            stock=5,
            status=ProductStatus.ACTIVE,
        )
        self.order_a = self._order(self.client_a, self.store_a, Decimal("250.00"))
        self.order_b = self._order(self.client_b, self.store_a, Decimal("100.00"))
        self.methods_url = reverse("seller_payment_methods:list-create")

    def _order(self, user, store, total):
        order = Order.objects.create(
            user=user,
            store=store,
            status=OrderStatus.PENDING,
            total_amount=total,
            store_name_snapshot=store.name,
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name_snapshot="Item",
            unit_price=total,
            quantity=1,
            subtotal=total,
        )
        return order

    def _method(self, store, **kwargs):
        data = {
            "store": store,
            "type": PaymentMethodType.MOBILE_MONEY,
            "label": "Orange Money",
            "account_name": "Vendeur Test",
            "account_number": "06XXXXXXXX",
            "instructions": "Transférez puis envoyez la preuve.",
            "is_active": True,
        }
        data.update(kwargs)
        return PaymentMethod.objects.create(**data)


class PaymentMethodTests(PaymentBase):
    def test_seller_crud_isolation(self):
        self.client.force_authenticate(user=self.seller_a)
        create = self.client.post(
            self.methods_url,
            {
                "type": "MOBILE_MONEY",
                "label": "Orange Money",
                "account_name": "Ali",
                "account_number": "0600000000",
                "instructions": "Payer exact",
                "store": str(self.store_b.id),
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_400_BAD_REQUEST)

        create = self.client.post(
            self.methods_url,
            {
                "type": "MOBILE_MONEY",
                "label": "Orange Money",
                "account_name": "Ali",
                "account_number": "0600000000",
                "instructions": "Payer exact",
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        method_id = create.data["id"]
        self.assertEqual(
            PaymentMethod.objects.get(pk=method_id).store_id, self.store_a.id
        )

        patch = self.client.patch(
            reverse("seller_payment_methods:detail", kwargs={"method_id": method_id}),
            {"label": "OM Pro"},
            format="json",
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data["label"], "OM Pro")

        foreign = self._method(self.store_b, label="Other")
        self.client.force_authenticate(user=self.seller_a)
        steal = self.client.patch(
            reverse(
                "seller_payment_methods:detail", kwargs={"method_id": foreign.id}
            ),
            {"label": "Hack"},
            format="json",
        )
        self.assertEqual(steal.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.client_a)
        forbidden = self.client.post(
            self.methods_url,
            {"type": "CASH", "label": "Cash", "account_name": "X"},
            format="json",
        )
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.seller_a)
        delete = self.client.delete(
            reverse("seller_payment_methods:detail", kwargs={"method_id": method_id})
        )
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)


class PaymentFlowTests(PaymentBase):
    def setUp(self):
        super().setUp()
        self.method_a = self._method(self.store_a)
        self.method_b = self._method(self.store_b, label="Banque B")
        self.inactive = self._method(
            self.store_a, label="Inactif", is_active=False
        )

    def test_create_payment_rules(self):
        self.client.force_authenticate(user=self.client_a)
        url = f"/api/v1/orders/{self.order_a.id}/payment/"

        bad_amount = self.client.post(
            url,
            {"payment_method_id": str(self.method_a.id), "amount": "1"},
            format="json",
        )
        self.assertEqual(bad_amount.status_code, status.HTTP_400_BAD_REQUEST)

        other_store = self.client.post(
            url,
            {"payment_method_id": str(self.method_b.id)},
            format="json",
        )
        self.assertEqual(other_store.status_code, status.HTTP_400_BAD_REQUEST)

        inactive = self.client.post(
            url,
            {"payment_method_id": str(self.inactive.id)},
            format="json",
        )
        self.assertEqual(inactive.status_code, status.HTTP_400_BAD_REQUEST)

        ok = self.client.post(
            url, {"payment_method_id": str(self.method_a.id)}, format="json"
        )
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ok.data["amount"], "250.00")
        self.assertEqual(ok.data["status"], PaymentStatus.PENDING)
        self.assertEqual(ok.data["payment_method"]["label"], "Orange Money")

        # Duplicate payment already covered below via client_b isolation;
        # non-PENDING order cannot create payment
        self.order_b.status = OrderStatus.CONFIRMED
        self.order_b.save(update_fields=["status"])
        self.client.force_authenticate(user=self.client_b)
        confirmed_blocked = self.client.post(
            f"/api/v1/orders/{self.order_b.id}/payment/",
            {"payment_method_id": str(self.method_a.id)},
            format="json",
        )
        self.assertEqual(confirmed_blocked.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.force_authenticate(user=self.client_b)
        steal = self.client.post(
            url, {"payment_method_id": str(self.method_a.id)}, format="json"
        )
        self.assertEqual(steal.status_code, status.HTTP_404_NOT_FOUND)

    def test_proof_and_seller_confirm_reject(self):
        self.client.force_authenticate(user=self.client_a)
        pay_url = f"/api/v1/orders/{self.order_a.id}/payment/"
        self.client.post(
            pay_url, {"payment_method_id": str(self.method_a.id)}, format="json"
        )
        proof_url = f"/api/v1/orders/{self.order_a.id}/payment/proof/"

        for name, factory in (
            ("a.jpg", lambda: make_image("a.jpg", "JPEG")),
            ("b.png", lambda: make_image("b.png", "PNG")),
            ("c.pdf", make_pdf),
        ):
            Payment.objects.filter(order=self.order_a).update(
                status=PaymentStatus.PENDING if name == "a.jpg" else PaymentStatus.REJECTED
            )
            resp = self.client.post(proof_url, {"proof": factory()}, format="multipart")
            self.assertEqual(resp.status_code, status.HTTP_200_OK, name)
            self.assertEqual(resp.data["status"], PaymentStatus.PROOF_SUBMITTED)

        bad = self.client.post(
            proof_url,
            {
                "proof": SimpleUploadedFile(
                    "x.exe", b"MZ\x00", content_type="application/octet-stream"
                )
            },
            format="multipart",
        )
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

        # Seller B cannot confirm
        self.client.force_authenticate(user=self.seller_b)
        steal = self.client.post(
            f"/api/v1/seller/orders/{self.order_a.id}/payment/confirm/",
            {},
            format="json",
        )
        self.assertEqual(steal.status_code, status.HTTP_404_NOT_FOUND)

        # Client cannot confirm
        self.client.force_authenticate(user=self.client_a)
        client_confirm = self.client.post(
            f"/api/v1/seller/orders/{self.order_a.id}/payment/confirm/",
            {},
            format="json",
        )
        self.assertEqual(client_confirm.status_code, status.HTTP_403_FORBIDDEN)

        # Admin cannot confirm via seller endpoint
        self.client.force_authenticate(user=self.admin)
        admin_confirm = self.client.post(
            f"/api/v1/seller/orders/{self.order_a.id}/payment/confirm/",
            {},
            format="json",
        )
        self.assertEqual(admin_confirm.status_code, status.HTTP_403_FORBIDDEN)

        # Reject then resubmit then confirm
        Payment.objects.filter(order=self.order_a).update(
            status=PaymentStatus.PROOF_SUBMITTED
        )
        self.client.force_authenticate(user=self.seller_a)
        no_reason = self.client.post(
            f"/api/v1/seller/orders/{self.order_a.id}/payment/reject/",
            {},
            format="json",
        )
        self.assertEqual(no_reason.status_code, status.HTTP_400_BAD_REQUEST)

        rejected = self.client.post(
            f"/api/v1/seller/orders/{self.order_a.id}/payment/reject/",
            {"reason": "Montant incorrect"},
            format="json",
        )
        self.assertEqual(rejected.status_code, status.HTTP_200_OK)
        self.assertEqual(rejected.data["status"], PaymentStatus.REJECTED)

        self.client.force_authenticate(user=self.client_a)
        again = self.client.post(
            proof_url, {"proof": make_image("new.jpg")}, format="multipart"
        )
        self.assertEqual(again.status_code, status.HTTP_200_OK)
        self.assertEqual(again.data["status"], PaymentStatus.PROOF_SUBMITTED)
        self.assertGreaterEqual(len(again.data["proofs"]), 2)

        self.client.force_authenticate(user=self.seller_a)
        confirmed = self.client.post(
            f"/api/v1/seller/orders/{self.order_a.id}/payment/confirm/",
            {},
            format="json",
        )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        self.assertEqual(confirmed.data["status"], PaymentStatus.CONFIRMED)
        self.order_a.refresh_from_db()
        self.assertEqual(self.order_a.status, OrderStatus.CONFIRMED)

    def test_client_cannot_access_other_proof(self):
        method = self.method_a
        Payment.objects.create(
            order=self.order_a,
            payment_method=method,
            amount=self.order_a.total_amount,
            status=PaymentStatus.PENDING,
        )
        self.client.force_authenticate(user=self.client_b)
        response = self.client.post(
            f"/api/v1/orders/{self.order_a.id}/payment/proof/",
            {"proof": make_image()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

class ServiceRequestPaymentTests(APITestCase):
    def setUp(self):
        from apps.categories.models import Category
        from apps.professionals.models import ProfessionalProfile, ProfessionalStatus
        from apps.services.models import (
            Service,
            ServicePriceType,
            ServiceRequest,
            ServiceRequestStatus,
            ServiceStatus,
        )

        self.city = City.objects.create(
            name='Tanger SR', slug='tanger-sr-pay', region='Nord', is_active=True
        )
        self.category = Category.objects.create(
            name='Plomberie Pay', slug='plomberie-pay', is_active=True, order=1
        )
        self.client_u = make_user('client.sr.pay@servis.ma', UserRole.CLIENT)
        self.seller = make_user('seller.sr.pay@servis.ma', UserRole.SELLER)
        self.store = Store.objects.create(
            owner=self.seller,
            name='Boutique SR',
            slug='boutique-sr-pay',
            city=self.city,
            status=StoreStatus.ACTIVE,
        )
        self.method = PaymentMethod.objects.create(
            store=self.store,
            type=PaymentMethodType.MOBILE_MONEY,
            label='CIH',
            account_name='Pro',
            account_number='0612345678',
            instructions='Envoyez le montant',
            is_active=True,
        )
        self.profile = ProfessionalProfile.objects.create(
            owner=self.seller,
            display_name='Pro Pay',
            slug='pro-pay-sr',
            headline='Pro',
            city=self.city,
            phone='+212612345678',
            status=ProfessionalStatus.ACTIVE,
        )
        self.service = Service.objects.create(
            professional_profile=self.profile,
            name='Intervention',
            slug='intervention-pay',
            description='Fix',
            price=Decimal('200.00'),
            price_type=ServicePriceType.FIXED,
            status=ServiceStatus.ACTIVE,
            category=self.category,
        )
        self.sr = ServiceRequest.objects.create(
            service=self.service,
            professional=self.profile,
            client=self.client_u,
            status=ServiceRequestStatus.ACCEPTED,
            message='Besoin d aide',
            address='Rue X, Tanger',
            phone='+212698765432',
        )

    def test_service_request_payment_flow(self):
        self.client.force_authenticate(user=self.client_u)
        methods = self.client.get(
            f'/api/v1/service-requests/{self.sr.id}/payment-methods/'
        )
        self.assertEqual(methods.status_code, status.HTTP_200_OK)
        self.assertEqual(len(methods.data), 1)

        created = self.client.post(
            f'/api/v1/service-requests/{self.sr.id}/payment/',
            {'payment_method_id': str(self.method.id)},
            format='json',
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data['status'], PaymentStatus.PENDING)
        self.assertEqual(created.data['amount'], '200.00')
        self.assertIsNone(created.data['order_id'])
        self.assertEqual(created.data['service_request_id'], str(self.sr.id))

        proof = self.client.post(
            f'/api/v1/service-requests/{self.sr.id}/payment/proof/',
            {'proof': make_image('sr-proof.jpg')},
            format='multipart',
        )
        self.assertEqual(proof.status_code, status.HTTP_200_OK)
        self.assertEqual(proof.data['status'], PaymentStatus.PROOF_SUBMITTED)

        self.client.force_authenticate(user=self.seller)
        confirmed = self.client.post(
            f'/api/v1/seller/service-requests/{self.sr.id}/payment/confirm/',
            {},
            format='json',
        )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        self.assertEqual(confirmed.data['status'], PaymentStatus.CONFIRMED)

    def test_quote_service_cannot_create_payment(self):
        from apps.services.models import ServicePriceType

        self.service.price_type = ServicePriceType.QUOTE
        self.service.price = None
        self.service.save()
        self.client.force_authenticate(user=self.client_u)
        res = self.client.post(
            f'/api/v1/service-requests/{self.sr.id}/payment/',
            {'payment_method_id': str(self.method.id)},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
